import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';
const PUBLIC_VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY || 'BJ0LuD-65IkI6vNCeTHHTQrMDSTfxdCUVONrCjv-qhpeVhzBUkbpsshN4K6vuc2hiUuMzkMONzYQMsJ4aJrF-3U';
const PRIVATE_VAPID_KEY = process.env.VITE_FIREBASE_VAPID_PRIVATE_KEY || 'XRhv2Uo1SuMAil7eERnxLt8rg7Tl-E27VTKf2Senc7s';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function base64UrlToUint8Array(base64Url) {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const buffer = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    buffer[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

function uint8ArrayToBase64Url(uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8Array.byteLength; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createVapidJwt(endpoint, subject = 'mailto:elipsestudiohr@gmail.com') {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 12 * 60 * 60; // 12 hours

  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = { aud: audience, exp, sub: subject };

  const encodedHeader = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(header)));
  const encodedPayload = uint8ArrayToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const dBytes = base64UrlToUint8Array(PRIVATE_VAPID_KEY);
  const pubBytes = base64UrlToUint8Array(PUBLIC_VAPID_KEY);
  const xBytes = pubBytes.slice(1, 33);
  const yBytes = pubBytes.slice(33, 65);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: uint8ArrayToBase64Url(xBytes),
    y: uint8ArrayToBase64Url(yBytes),
    d: uint8ArrayToBase64Url(dBytes),
    ext: true
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const encodedSignature = uint8ArrayToBase64Url(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${encodedSignature}`;

  return `vapid t=${jwt}, k=${PUBLIC_VAPID_KEY}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { targetUserId } = req.body || {};
  const cleanTarget = String(targetUserId || '').trim().toLowerCase();

  try {
    let query = supabase.from('user_push_tokens').select('*');

    if (cleanTarget === 'admin') {
      query = query.or('role.eq.admin,email.eq.elipsestudiohr@gmail.com');
    } else if (cleanTarget && cleanTarget !== 'all' && cleanTarget !== 'null') {
      query = query.or(`user_id.eq.${cleanTarget},email.eq.${cleanTarget}`);
    }

    const { data: tokens, error } = await query;
    if (error || !tokens || tokens.length === 0) {
      return res.status(200).json({ success: true, delivered: 0, message: 'No device tokens found' });
    }

    let successCount = 0;
    const errors = [];
    const deadTokens = [];

    await Promise.all(
      tokens.map(async (record) => {
        if (!record.subscription_data) return;
        try {
          const sub = typeof record.subscription_data === 'string' ? JSON.parse(record.subscription_data) : record.subscription_data;
          if (!sub || !sub.endpoint) return;

          const authHeader = await createVapidJwt(sub.endpoint);

          const pushRes = await fetch(sub.endpoint, {
            method: 'POST',
            headers: {
              'Authorization': authHeader,
              'TTL': '86400',
              'Urgency': 'high',
              'Content-Length': '0'
            }
          });

          if (pushRes.ok || pushRes.status === 201 || pushRes.status === 200) {
            successCount++;
          } else if (pushRes.status === 410 || pushRes.status === 404) {
            // Push token expired on phone - mark for cleanup
            deadTokens.push(record.id);
          } else {
            const errText = await pushRes.text().catch(() => '');
            errors.push({ endpoint: sub.endpoint, status: pushRes.status, error: errText });
          }
        } catch (subErr) {
          errors.push({ error: subErr.message });
        }
      })
    );

    // Asynchronously delete dead tokens from DB
    if (deadTokens.length > 0) {
      supabase.from('user_push_tokens').delete().in('id', deadTokens).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      delivered: successCount,
      totalTokens: tokens.length,
      purgedDeadTokens: deadTokens.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

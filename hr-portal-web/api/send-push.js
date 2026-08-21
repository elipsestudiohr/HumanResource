import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';
const PUBLIC_VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY || 'BJ0LuD-65IkI6vNCeTHHTQrMDSTfxdCUVONrCjv-qhpeVhzBUkbpsshN4K6vuc2hiUuMzkMONzYQMsJ4aJrF-3U';
const PRIVATE_VAPID_KEY = process.env.VITE_FIREBASE_VAPID_PRIVATE_KEY || 'XRhv2Uo1SuMAil7eERnxLt8rg7Tl-E27VTKf2Senc7s';

webpush.setVapidDetails(
  'mailto:elipsestudiohr@gmail.com',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { targetUserId, title, message, url } = req.body || {};
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

    const payload = JSON.stringify({
      id: Date.now(),
      title: title || 'Elipse HR Portal',
      body: message || '',
      url: url || '/'
    });

    let successCount = 0;
    const errors = [];
    const deadTokens = [];

    await Promise.all(
      tokens.map(async (record) => {
        if (!record.subscription_data) return;
        try {
          const sub = typeof record.subscription_data === 'string' ? JSON.parse(record.subscription_data) : record.subscription_data;
          if (!sub || !sub.endpoint || !sub.keys) return;

          const pushRes = await webpush.sendNotification(sub, payload, {
            TTL: 86400,
            urgency: 'high'
          });

          if (pushRes.statusCode === 201 || pushRes.statusCode === 200) {
            successCount++;
          }
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            deadTokens.push(record.id);
          } else {
            errors.push({ id: record.id, status: err.statusCode, error: err.message });
          }
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

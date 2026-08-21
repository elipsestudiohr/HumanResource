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
  try {
    const { data: tokens, error } = await supabase.from('user_push_tokens').select('*');
    if (error || !tokens || tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No tokens found in database' });
    }

    const payload = JSON.stringify({
      id: Date.now(),
      title: '🔔 LOCK SCREEN TEST',
      body: 'If your phone is locked, this encrypted push proves real-time delivery works!',
      url: '/'
    });

    let deliveredCount = 0;
    const results = [];

    for (const record of tokens) {
      if (!record.subscription_data) continue;
      try {
        const sub = typeof record.subscription_data === 'string' ? JSON.parse(record.subscription_data) : record.subscription_data;
        if (!sub || !sub.endpoint || !sub.keys) continue;

        const pushRes = await webpush.sendNotification(sub, payload, {
          TTL: 86400,
          urgency: 'high'
        });

        if (pushRes.statusCode === 201 || pushRes.statusCode === 200) {
          deliveredCount++;
          results.push({ email: record.email, status: 201 });
        }
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          supabase.from('user_push_tokens').delete().eq('id', record.id).catch(() => {});
        }
        results.push({ email: record.email, status: err.statusCode || err.message });
      }
    }

    return res.status(200).json({
      success: true,
      delivered: deliveredCount,
      total: tokens.length,
      results
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

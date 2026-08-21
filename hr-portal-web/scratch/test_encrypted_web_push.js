import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';
const PUBLIC_VAPID_KEY = 'BJ0LuD-65IkI6vNCeTHHTQrMDSTfxdCUVONrCjv-qhpeVhzBUkbpsshN4K6vuc2hiUuMzkMONzYQMsJ4aJrF-3U';
const PRIVATE_VAPID_KEY = 'XRhv2Uo1SuMAil7eERnxLt8rg7Tl-E27VTKf2Senc7s';

webpush.setVapidDetails(
  'mailto:elipsestudiohr@gmail.com',
  PUBLIC_VAPID_KEY,
  PRIVATE_VAPID_KEY
);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const { data: tokens } = await supabase.from('user_push_tokens').select('*');
  console.log(`Found ${tokens.length} tokens.`);

  const payload = JSON.stringify({
    title: '🔔 Lock Screen Test',
    body: 'If your phone is locked, this encrypted push proves real-time delivery works!',
    id: Date.now()
  });

  for (const record of tokens) {
    if (!record.subscription_data) continue;
    try {
      const sub = typeof record.subscription_data === 'string' ? JSON.parse(record.subscription_data) : record.subscription_data;
      if (!sub || !sub.endpoint || !sub.keys) continue;

      console.log(`\nSending encrypted push to: ${record.device_info.substring(0, 35)} (${record.email})`);
      const res = await webpush.sendNotification(sub, payload, {
        TTL: 86400,
        urgency: 'high'
      });
      console.log(`SUCCESS! Status: ${res.statusCode}`);
    } catch (err) {
      console.log(`Failed: ${err.statusCode || err.message}`);
    }
  }
}

test();

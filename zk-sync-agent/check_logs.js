const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const key = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(url, key);

async function run() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const serviceClient = createClient(url, serviceKey);
  const { data: profiles } = await serviceClient.from('profiles').select('*');
  const admin = profiles.find(p => p.role === 'admin');
  console.log('Admin profile from DB:', admin);

  if (!admin) {
    console.error('No admin profile found!');
    return;
  }

  console.log(`Signing in as admin (${admin.email})...`);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: admin.email,
    password: admin.password
  });

  if (authError) {
    console.error('Auth Error:', authError.message);
    return;
  }

  console.log('Auth Success! Token:', authData.session.access_token.substring(0, 15) + '...');

  const authClient = createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`
      }
    }
  });

  const { data: logs, error: selectError } = await authClient
    .from('raw_attendance_logs')
    .select('*')
    .eq('employee_pin', '17');

  if (selectError) {
    console.error('Select Error:', selectError.message);
  } else {
    console.log(`SUCCESS! Selected ${logs.length} logs for PIN 17 as admin.`);
    logs.slice(0, 5).forEach(l => console.log(` - ${l.timestamp}`));
  }
}

run().catch(console.error);

const { createClient } = require('@supabase/supabase-js');

const url = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

const supabase = createClient(url, key);

async function run() {
  const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY3MDM1NywiZXhwIjoyMDk5MjQ2MzU3fQ.g0kgX6DRX8Tny4ruyHNL6MV9TgA_dn_aNJ4lJKQylUU';
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

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInsert() {
  const { data, error } = await supabase.from('device_settings').upsert({
    id: 1,
    ip_address: '192.168.1.201',
    port: 4370,
    sync_interval: 1,
    status: 'Offline',
    is_notifications_muted: false
  }).select();
  console.log('Upsert result:', data, 'error:', error);
}

testInsert();

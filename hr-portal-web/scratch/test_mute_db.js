import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testMute() {
  console.log('1. Setting muted to true in shift_timings...');
  await supabase.from('shift_timings').upsert({
    target_type: 'department',
    target_id: 'GLOBAL_DEFAULT_SETTINGS',
    target_name: 'Global Default Settings [GRACE:20][MONTHLY:{}][MUTED:true]',
    start_time: '11:00',
    end_time: '20:00',
    grace_mins: 20,
    is_fixed_hours: true,
    total_hours: 9,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    allow_regular_overtime: true
  });

  const { data: d1 } = await supabase.from('shift_timings').select('target_name').eq('target_id', 'GLOBAL_DEFAULT_SETTINGS').maybeSingle();
  console.log('Read tag:', d1?.target_name);

  console.log('2. Testing send-push when muted...');
  const pushRes = await fetch('http://localhost:3000/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetUserId: 'admin', title: 'Test', message: 'Test' })
  }).catch(() => null);

  console.log('3. Setting muted back to false in shift_timings...');
  await supabase.from('shift_timings').upsert({
    target_type: 'department',
    target_id: 'GLOBAL_DEFAULT_SETTINGS',
    target_name: 'Global Default Settings [GRACE:20][MONTHLY:{}][MUTED:false]',
    start_time: '11:00',
    end_time: '20:00',
    grace_mins: 20,
    is_fixed_hours: true,
    total_hours: 9,
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    allow_regular_overtime: true
  });

  const { data: d2 } = await supabase.from('shift_timings').select('target_name').eq('target_id', 'GLOBAL_DEFAULT_SETTINGS').maybeSingle();
  console.log('Read tag:', d2?.target_name);
}

testMute();

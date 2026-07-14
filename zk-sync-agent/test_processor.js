const { createClient } = require('@supabase/supabase-js');
const { processAttendanceLogs } = require('../hr-portal-web/src/utils/attendanceProcessor');
require('dotenv').config();

const url = process.env.SUPABASE_URL || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, key);

async function run() {
  // Fetch profile for PIN 17
  const { data: profiles } = await supabase.from('profiles').select('*').eq('pin', '17');
  const emp = profiles[0];
  console.log('Profile:', emp);

  // Fetch raw logs
  const { data: logs } = await supabase.from('raw_attendance_logs').select('*').eq('employee_pin', '17');
  console.log(`Logs found: ${logs.length}`);

  // Fetch leaves
  const { data: leaves } = await supabase.from('leave_requests').select('*').eq('employee_id', emp.id);

  // Run processor for July 2026
  const processed = processAttendanceLogs(
    emp,
    logs,
    leaves,
    '2026-07-01',
    '2026-07-31',
    [],
    20,
    '11:00',
    '20:00'
  );

  console.log('\n--- Calculated Summaries ---');
  processed.forEach(s => {
    console.log(`[DAY] ${s.date} - Status: ${s.status}, punches: ${s.checkIn || '-'} / ${s.checkOut || '-'}`);
  });
}

run().catch(console.error);

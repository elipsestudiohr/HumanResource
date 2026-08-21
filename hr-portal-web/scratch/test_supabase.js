import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const dummyUuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

  console.log('1. Inserting test leave request...');
  const { data: inserted, error: insErr } = await supabase.from('leave_requests').insert({
    employee_id: dummyUuid,
    leave_type: 'Casual',
    start_date: '2026-08-25',
    end_date: '2026-08-26',
    reason: 'Test Pending Deletion',
    status: 'Pending'
  }).select().single();

  console.log('Inserted:', inserted, 'Insert error:', insErr);

  if (inserted) {
    console.log('2. Trying to delete leave request id:', inserted.id);
    const { data: delData, error: delErr } = await supabase.from('leave_requests').delete().eq('id', inserted.id).select();
    console.log('Deleted data returned:', delData, 'Delete error:', delErr);

    const { data: check } = await supabase.from('leave_requests').select('*').eq('id', inserted.id);
    console.log('Check after delete (should be empty):', check);
  }
}

test();

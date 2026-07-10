const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Calling save_employee_user RPC...");
  const { data, error } = await supabase.rpc('save_employee_user', {
    id_val: null,
    email_val: 'test_employee_xyz@gmail.com',
    password_val: 'Password123!',
    pin_val: '8888',
    name_val: 'Test Employee XYZ',
    designation_val: 'QA Tester',
    department_val: 'QA',
    salary_val: 50000,
    hourly_val: 231.48
  });

  if (error) {
    console.error("RPC Error:", error);
  } else {
    console.log("RPC Success, returned user ID:", data);
  }
}

test();

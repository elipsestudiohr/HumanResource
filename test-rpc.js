const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './hr-portal-web/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

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

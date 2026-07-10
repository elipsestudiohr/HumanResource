const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

// Isolated signup client (same as we defined in the web app)
const signUpClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

// Normal signin client
const signInClient = createClient(supabaseUrl, supabaseAnonKey);

async function runFlow() {
  const randomEmail = `employee_${Math.floor(Math.random() * 100000)}@elipsestudio.com`;
  const password = 'SecurePassword123!';

  console.log(`[1] Signing up new employee: ${randomEmail}...`);
  const { data: signUpData, error: signUpError } = await signUpClient.auth.signUp({
    email: randomEmail,
    password,
    options: {
      data: {
        full_name: 'Test Native Flow',
        pin: `P${Math.floor(Math.random() * 10000)}`,
        designation: 'Staff',
        department: 'Operations',
        base_salary: 45000,
        hourly_rate: 208.33
      }
    }
  });

  if (signUpError) {
    console.error("SignUp Error:", signUpError);
    return;
  }

  console.log("SignUp Success! User ID:", signUpData.user.id);

  console.log(`[2] Simulating login with the new credentials...`);
  const { data: signInData, error: signInError } = await signInClient.auth.signInWithPassword({
    email: randomEmail,
    password
  });

  if (signInError) {
    console.error("SignIn Error (failed with 500/etc):", signInError);
  } else {
    console.log("SUCCESS! User signed in successfully. Session Token:", signInData.session.access_token.substring(0, 15) + "...");
  }
}

runFlow();

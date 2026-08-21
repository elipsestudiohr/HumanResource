import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fkhuybrvtkrdccqswzqr.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHV5YnJ2dGtyZGNjcXN3enFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NzAzNTcsImV4cCI6MjA5OTI0NjM1N30.TtWCMMIMSAs7zY7h46sFAqYvBMBv6JIY0jxwyzCH4VM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testInsert() {
  const { data, error } = await supabase.from('user_push_tokens').upsert({
    user_id: 'test-user-id',
    email: 'test@elipse.com',
    role: 'employee',
    token: 'test-dummy-token-12345',
    subscription_data: JSON.stringify({ endpoint: 'https://test.endpoint' }),
    device_info: 'NodeJS Test Agent',
    updated_at: new Date().toISOString()
  }, { onConflict: 'token' }).select();

  console.log('Upsert result:', { data, error });
}

testInsert();

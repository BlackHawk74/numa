const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserCreation() {
  console.log('Testing user creation...');
  
  try {
    // Try to create a test user
    const { data, error } = await supabase
      .from('users')
      .insert([
        { name: 'Test User', preferences: {} }
      ])
      .select();
    
    if (error) {
      console.error('User creation failed:', error);
      
      // If it's an RLS error, we need to disable RLS through the Supabase dashboard
      if (error.message.includes('row-level security')) {
        console.log('\n❌ RLS is blocking user creation.');
        console.log('Please disable RLS in the Supabase dashboard:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Go to Authentication > Policies');
        console.log('4. Disable RLS for users, sessions, and goals tables');
        console.log('5. Or run these SQL commands in the SQL editor:');
        console.log('   ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
        console.log('   ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;');
        console.log('   ALTER TABLE goals DISABLE ROW LEVEL SECURITY;');
      }
    } else {
      console.log('✅ User creation successful:', data);
      
      // Clean up test user
      if (data && data[0]) {
        await supabase
          .from('users')
          .delete()
          .eq('id', data[0].id);
        console.log('Test user cleaned up');
      }
    }
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testUserCreation();
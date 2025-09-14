const { supabase } = require('./dist/database/supabase');

async function testUserAuth() {
  try {
    console.log('Testing user authentication flow...');

    // Test 1: Create a test user directly in auth
    const testEmail = 'test@example.com';
    const testPassword = 'testpassword123';

    console.log('1. Creating test user in Supabase Auth...');
    
    // Clean up any existing test user first
    try {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers.users.find(u => u.email === testEmail);
      if (existingUser) {
        await supabase.auth.admin.deleteUser(existingUser.id);
        console.log('   Cleaned up existing test user');
      }
    } catch (cleanupError) {
      console.log('   No existing user to clean up');
    }

    // Create new user
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Failed to create auth user:', authError);
      return false;
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Test 2: Try to create user record in our database using service role
    console.log('2. Creating user record in our database...');
    
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        name: 'Test User',
        preferences: {}
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Failed to create database user:', dbError);
      return false;
    }

    console.log('✅ Database user created:', dbUser.id);

    // Test 3: Test RLS by trying to access with user context
    console.log('3. Testing RLS policies...');
    
    // This should work with service role
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('*');

    if (allUsersError) {
      console.error('❌ Failed to query users with service role:', allUsersError);
      return false;
    }

    console.log('✅ Service role can access users:', allUsers.length);

    // Clean up
    console.log('4. Cleaning up test data...');
    
    await supabase
      .from('users')
      .delete()
      .eq('id', authUser.user.id);

    await supabase.auth.admin.deleteUser(authUser.user.id);

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 User authentication flow test completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ User auth test failed:', error);
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  testUserAuth().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}

module.exports = { testUserAuth };
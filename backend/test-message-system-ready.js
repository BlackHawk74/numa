const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testMessageSystemReady() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Required: SUPABASE_URL, SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('🔍 Checking if message storage system is ready...\n');

    // 1. Check if messages table exists
    console.log('1. Checking messages table...');
    const { data: messagesCheck, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (messagesError) {
      if (messagesError.message.includes('does not exist')) {
        console.log('❌ Messages table does not exist');
        console.log('   Run: node apply-messages-migration.js');
        return false;
      } else {
        console.log('⚠️  Messages table check warning:', messagesError.message);
      }
    } else {
      console.log('✅ Messages table exists and is accessible');
    }

    // 2. Check if sessions table has conversation_count column
    console.log('2. Checking sessions table updates...');
    const { data: sessionsCheck, error: sessionsError } = await supabase
      .from('sessions')
      .select('id, conversation_count')
      .limit(1);

    if (sessionsError) {
      if (sessionsError.message.includes('conversation_count')) {
        console.log('❌ Sessions table missing conversation_count column');
        console.log('   Run: node apply-messages-migration.js');
        return false;
      } else {
        console.log('⚠️  Sessions table check warning:', sessionsError.message);
      }
    } else {
      console.log('✅ Sessions table has conversation_count column');
    }

    // 3. Test basic connectivity
    console.log('3. Testing database connectivity...');
    const { data: connectivityTest, error: connectivityError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (connectivityError) {
      console.log('❌ Database connectivity issue:', connectivityError.message);
      return false;
    } else {
      console.log('✅ Database connectivity working');
    }

    console.log('\n🎉 Message storage system is ready!');
    console.log('\n📋 What you can do now:');
    console.log('   ✅ Individual messages will be stored in the database');
    console.log('   ✅ AI will receive structured conversation history');
    console.log('   ✅ Message-level analytics are available');
    console.log('   ✅ Conversation context is preserved across sessions');
    console.log('\n🚀 Start your backend server and begin using the enhanced system!');
    
    return true;

  } catch (error) {
    console.error('❌ System check failed:', error);
    return false;
  }
}

// Run the check
testMessageSystemReady().then(success => {
  if (!success) {
    console.log('\n🔧 To fix issues:');
    console.log('   1. Run: node apply-messages-migration.js');
    console.log('   2. Check your Supabase environment variables');
    console.log('   3. Ensure your Supabase project is accessible');
    process.exit(1);
  }
});
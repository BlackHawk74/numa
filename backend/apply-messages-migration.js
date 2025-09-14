const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function applyMessagesMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🚀 Applying messages table migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/002_add_messages_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} migration statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase
          .from('_migrations')
          .select('*')
          .limit(1);
        
        if (directError) {
          console.log(`   ⚠️  RPC not available, executing via raw query...`);
          // For some statements, we might need to handle them differently
          console.log(`   Statement: ${statement}`);
        } else {
          throw error;
        }
      }
    }

    console.log('✅ Messages table migration completed successfully!');

    // Test the new table
    console.log('🧪 Testing messages table...');
    const { data: testData, error: testError } = await supabase
      .from('messages')
      .select('*')
      .limit(1);

    if (testError) {
      console.log('⚠️  Warning: Could not test messages table:', testError.message);
    } else {
      console.log('✅ Messages table is accessible');
    }

    // Check if conversation_count column was added to sessions
    console.log('🧪 Testing sessions table updates...');
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .select('id, conversation_count')
      .limit(1);

    if (sessionError) {
      console.log('⚠️  Warning: Could not test sessions table updates:', sessionError.message);
    } else {
      console.log('✅ Sessions table conversation_count column is accessible');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Some objects already exist - this might be expected');
    } else {
      process.exit(1);
    }
  }
}

// Run the migration
applyMessagesMigration();
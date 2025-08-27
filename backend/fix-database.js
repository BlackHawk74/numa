const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixDatabase() {
  console.log('Disabling RLS for demo...');
  
  try {
    // Disable RLS on all tables
    const queries = [
      'ALTER TABLE users DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE goals DISABLE ROW LEVEL SECURITY;'
    ];
    
    for (const query of queries) {
      console.log('Executing:', query);
      const { error } = await supabase.rpc('exec_sql', { sql: query });
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('✅ Success');
      }
    }
    
    console.log('Database fixed! RLS disabled for demo.');
  } catch (error) {
    console.error('Failed to fix database:', error);
  }
}

fixDatabase();
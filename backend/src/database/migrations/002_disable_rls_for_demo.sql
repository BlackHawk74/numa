-- Temporary migration to disable RLS for demo purposes
-- This allows the application to work without Supabase Auth

-- Disable RLS on all tables for demo
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;

-- Drop existing policies (they will be recreated when we implement proper auth)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;

-- Add a comment for future reference
COMMENT ON TABLE users IS 'RLS disabled for demo - re-enable when implementing proper authentication';
COMMENT ON TABLE sessions IS 'RLS disabled for demo - re-enable when implementing proper authentication';
COMMENT ON TABLE goals IS 'RLS disabled for demo - re-enable when implementing proper authentication';
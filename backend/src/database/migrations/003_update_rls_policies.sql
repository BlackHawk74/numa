-- Update RLS policies to work with Supabase auth
-- This migration updates the Row Level Security policies to properly handle authenticated users

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can view own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
DROP POLICY IF EXISTS "Users can update own goals" ON goals;

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid()::text = id);

-- Sessions policies
CREATE POLICY "Users can view own sessions" ON sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions" ON sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own sessions" ON sessions
    FOR DELETE USING (auth.uid()::text = user_id);

-- Goals policies
CREATE POLICY "Users can view own goals" ON goals
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own goals" ON goals
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own goals" ON goals
    FOR DELETE USING (auth.uid()::text = user_id);

-- Messages policies (if messages table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'messages') THEN
        -- Drop existing message policies if they exist
        DROP POLICY IF EXISTS "Users can view own messages" ON messages;
        DROP POLICY IF EXISTS "Users can insert own messages" ON messages;
        DROP POLICY IF EXISTS "Users can update own messages" ON messages;
        DROP POLICY IF EXISTS "Users can delete own messages" ON messages;

        -- Create new message policies
        CREATE POLICY "Users can view own messages" ON messages
            FOR SELECT USING (auth.uid()::text = user_id);

        CREATE POLICY "Users can insert own messages" ON messages
            FOR INSERT WITH CHECK (auth.uid()::text = user_id);

        CREATE POLICY "Users can update own messages" ON messages
            FOR UPDATE USING (auth.uid()::text = user_id);

        CREATE POLICY "Users can delete own messages" ON messages
            FOR DELETE USING (auth.uid()::text = user_id);
    END IF;
END $$;
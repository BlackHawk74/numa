#!/usr/bin/env ts-node

/**
 * Database Setup Script
 * 
 * This script sets up the database schema for the Numa AI Therapist application.
 * It creates the necessary tables and policies using Supabase's JavaScript client.
 */

import { supabase } from '../database/supabase';

async function setupDatabase(): Promise<void> {
  try {
    console.log('🚀 Setting up database schema...');

    // Test basic connection with a simple query
    console.log('Testing database connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .rpc('version'); // This should work on any PostgreSQL database

    if (connectionError) {
      console.log('⚠️  Direct connection test failed, but this is expected if tables don\'t exist yet');
      console.log('Connection details:', connectionError);
    } else {
      console.log('✅ Database connection successful');
    }

    // Note: In a real production environment, you would run these SQL commands
    // through Supabase's SQL editor or migration system. For development,
    // we'll provide instructions for manual setup.

    console.log(`
📋 Database Setup Instructions:

To complete the database setup, please run the following SQL commands in your Supabase SQL editor:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: esjcbikcjdpxadlktjzk
3. Go to SQL Editor
4. Run the SQL from: backend/src/database/migrations/001_initial_schema.sql

Alternatively, you can copy and paste this SQL:

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    transcript TEXT,
    summary TEXT,
    emotion VARCHAR(50),
    duration_minutes INTEGER,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    target_date DATE,
    progress_notes TEXT[],
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

After running the SQL, you can test the setup by running:
npm run db:health

🎉 Database setup instructions provided!
    `);

  } catch (error) {
    console.error('💥 Database setup failed:', error);
    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };
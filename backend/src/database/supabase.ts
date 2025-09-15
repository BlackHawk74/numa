import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Database type definitions
export interface User {
  id: string;
  name?: string;
  created_at: string;
  preferences?: Record<string, any>;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  date?: string;
  transcript?: string;
  summary?: string;
  emotion?: string;
  duration_minutes?: number;
  status?: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  status?: 'active' | 'completed' | 'cancelled';
  target_date?: string;
  progress_notes?: string[];
  updated_at: string;
}

// Database schema type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          preferences?: Record<string, any>;
        };
        Update: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Session, 'id' | 'created_at' | 'updated_at'>>;
      };
      goals: {
        Row: Goal;
        Insert: Omit<Goal, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Goal, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
// Prefer service role key on the server to avoid RLS issues
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

// Use service role if available; otherwise fall back to anon key
const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;
if (!supabaseKey) {
  throw new Error('Missing Supabase key: provide SUPABASE_SERVICE_ROLE_KEY (recommended) or SUPABASE_ANON_KEY');
}

// Create and export Supabase client
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Server-side, don't persist sessions
    },
    db: {
      schema: 'public',
    },
  }
);

// Export client for testing and direct access
export default supabase;
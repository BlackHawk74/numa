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
  conversation_count?: number;
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

export interface Message {
  id: string;
  session_id: string;
  user_id: string;
  speaker: 'user' | 'numa' | 'system';
  content: string;
  emotion?: string;
  emotion_confidence?: number;
  timestamp: string;
  metadata?: Record<string, any>;
  created_at: string;
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
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

// Validate required environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

// Create and export Supabase client for server operations
// Use service role key for server-side operations that bypass RLS
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY not found, using anon key (RLS will be enforced)');
}

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
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

// Create client for user-authenticated operations (respects RLS)
export const createUserSupabaseClient = (accessToken: string): SupabaseClient<Database> => {
  return createClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  );
};

// Export client for testing and direct access
export default supabase;
// Session model interface and types

export interface Session {
  id: string;
  user_id: string;
  date: Date;
  transcript?: string;
  summary?: string;
  emotion?: EmotionType;
  duration_minutes?: number;
  status: SessionStatus;
  created_at: Date;
  updated_at: Date;
}

export type SessionStatus = 'active' | 'completed' | 'cancelled';

export type EmotionType = 
  | 'happy' 
  | 'sad' 
  | 'anxious' 
  | 'angry' 
  | 'neutral' 
  | 'excited' 
  | 'frustrated' 
  | 'hopeful' 
  | 'overwhelmed' 
  | 'calm';

export interface CreateSessionRequest {
  user_id: string;
  transcript?: string;
  summary?: string;
  emotion?: EmotionType;
  duration_minutes?: number;
}

export interface UpdateSessionRequest {
  transcript?: string;
  summary?: string;
  emotion?: EmotionType;
  duration_minutes?: number;
  status?: SessionStatus;
}

export interface SessionSummary {
  id: string;
  date: Date;
  summary?: string;
  emotion?: EmotionType;
  duration_minutes?: number;
  status: SessionStatus;
}

// Database row type (matches Supabase schema)
export interface SessionRow {
  id: string;
  user_id: string;
  date: string;
  transcript: string | null;
  summary: string | null;
  emotion: string | null;
  duration_minutes: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}
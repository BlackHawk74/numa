// User model interface and types

export interface User {
  id: string;
  name?: string;
  created_at: Date;
  preferences: UserPreferences;
  updated_at: Date;
}

export interface UserPreferences {
  voice_settings?: {
    preferred_voice?: string;
    speech_rate?: number;
    volume?: number;
  };
  therapy_settings?: {
    session_reminder?: boolean;
    goal_tracking?: boolean;
    emotion_tracking?: boolean;
  };
  privacy_settings?: {
    data_retention_days?: number;
    analytics_enabled?: boolean;
  };
}

export interface CreateUserRequest {
  name?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UpdateUserRequest {
  name?: string;
  preferences?: Partial<UserPreferences>;
}

// Database row type (matches Supabase schema)
export interface UserRow {
  id: string;
  name: string | null;
  created_at: string;
  preferences: Record<string, any>;
  updated_at: string;
}
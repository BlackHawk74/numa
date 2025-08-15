// Goal model interface and types

export interface Goal {
  id: string;
  user_id: string;
  description: string;
  created_at: Date;
  status: GoalStatus;
  target_date?: Date;
  progress_notes: string[];
  updated_at: Date;
}

export type GoalStatus = 'active' | 'completed' | 'cancelled';

export interface CreateGoalRequest {
  user_id: string;
  description: string;
  target_date?: Date;
  progress_notes?: string[];
}

export interface UpdateGoalRequest {
  description?: string;
  status?: GoalStatus;
  target_date?: Date;
  progress_notes?: string[];
}

export interface GoalProgress {
  goal_id: string;
  note: string;
  date: Date;
}

// Database row type (matches Supabase schema)
export interface GoalRow {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  status: string;
  target_date: string | null;
  progress_notes: string[];
  updated_at: string;
}
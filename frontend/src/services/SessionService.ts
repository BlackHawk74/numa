import { Session, User, Goal } from '../types';
import { apiClient } from '../utils/apiClient';
import { supabase } from '../lib/supabase';

export interface SessionWithContext {
  session: Session;
  userContext: {
    user: User;
    recentSessions: Session[];
    activeGoals: Goal[];
  };
}

export interface SessionListResponse {
  sessions: Session[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
  statistics: {
    totalSessions: number;
    completedSessions: number;
    averageDuration: number;
    mostCommonEmotion: string | null;
  };
}

/**
 * Service for managing therapy sessions
 */
export class SessionService {
  private static readonly BASE_URL = '/api/sessions';

  /**
   * Initialize a new session with user context
   */
  static async initializeSession(): Promise<SessionWithContext> {
    try {
      console.log('Initializing session for authenticated user');

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.post(`${this.BASE_URL}/initialize`, {}, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.session) {
        throw new Error('No session data received from server');
      }

      return {
        session: response.data.session,
        userContext: response.data.userContext
      };
    } catch (error) {
      console.error('Error initializing session:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to initialize session: ${error.message}`
          : 'Failed to initialize session'
      );
    }
  }

  /**
   * Get sessions for authenticated user
   */
  static async getUserSessions(
    limit: number = 10, 
    offset: number = 0
  ): Promise<SessionListResponse> {
    try {
      console.log('Fetching sessions for authenticated user');

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.get(this.BASE_URL, {
        params: { limit, offset },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch sessions: ${error.message}`
          : 'Failed to fetch sessions'
      );
    }
  }

  /**
   * Get a specific session by ID (must belong to authenticated user)
   */
  static async getSession(sessionId: string): Promise<Session> {
    try {
      console.log('Fetching session:', sessionId);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.get(`${this.BASE_URL}/session/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.session) {
        throw new Error('No session data received from server');
      }

      return response.data.session;
    } catch (error) {
      console.error('Error fetching session:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch session: ${error.message}`
          : 'Failed to fetch session'
      );
    }
  }

  /**
   * Update a session
   */
  static async updateSession(
    sessionId: string,
    updates: {
      transcript?: string;
      summary?: string;
      emotion?: string;
      status?: 'active' | 'completed' | 'paused';
      durationMinutes?: number;
    }
  ): Promise<Session> {
    try {
      console.log('Updating session:', sessionId, updates);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.put(`${this.BASE_URL}/${sessionId}`, updates, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.session) {
        throw new Error('No session data received from server');
      }

      return response.data.session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to update session: ${error.message}`
          : 'Failed to update session'
      );
    }
  }

  /**
   * Complete a session with summary and emotion
   */
  static async completeSession(
    sessionId: string,
    summary: string,
    emotion?: string,
    durationMinutes?: number
  ): Promise<Session> {
    try {
      console.log('Completing session:', sessionId);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.post(`${this.BASE_URL}/${sessionId}/complete`, {
        summary,
        emotion,
        durationMinutes
      }, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.session) {
        throw new Error('No session data received from server');
      }

      return response.data.session;
    } catch (error) {
      console.error('Error completing session:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to complete session: ${error.message}`
          : 'Failed to complete session'
      );
    }
  }

  /**
   * Delete a session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      console.log('Deleting session:', sessionId);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      await apiClient.delete(`${this.BASE_URL}/${sessionId}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to delete session: ${error.message}`
          : 'Failed to delete session'
      );
    }
  }

  /**
   * Add transcript to session
   */
  static async addTranscript(sessionId: string, transcript: string): Promise<Session> {
    try {
      return await this.updateSession(sessionId, { transcript });
    } catch (error) {
      console.error('Error adding transcript:', error);
      throw error;
    }
  }

  /**
   * Format session duration for display
   */
  static formatDuration(minutes?: number): string {
    if (!minutes) return 'Unknown duration';
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h ${remainingMinutes}m`;
  }

  /**
   * Format session date for display
   */
  static formatSessionDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays === 0) {
        return 'Today';
      } else if (diffInDays === 1) {
        return 'Yesterday';
      } else if (diffInDays < 7) {
        return `${diffInDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Unknown date';
    }
  }

  /**
   * Get emotion display color
   */
  static getEmotionColor(emotion?: string): string {
    if (!emotion) return 'text-gray-500';
    
    const emotionColors: Record<string, string> = {
      happy: 'text-green-500',
      sad: 'text-blue-500',
      anxious: 'text-yellow-500',
      angry: 'text-red-500',
      calm: 'text-green-400',
      frustrated: 'text-orange-500',
      hopeful: 'text-purple-500',
      neutral: 'text-gray-500'
    };

    return emotionColors[emotion.toLowerCase()] || 'text-gray-500';
  }
}
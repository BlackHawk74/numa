import { supabase, Session, Database } from '../supabase';
import { DatabaseUtils, DatabaseError } from '../connection';

export class SessionRepository {
  /**
   * Create a new session
   */
  static async create(sessionData: Database['public']['Tables']['sessions']['Insert']): Promise<Session> {
    try {
      if (!DatabaseUtils.isValidUUID(sessionData.user_id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const response = await supabase
        .from('sessions')
        .insert(sessionData)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'session creation');
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Find session by ID
   */
  static async findById(id: string): Promise<Session | null> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('sessions')
        .select('*')
        .eq('id', id)
        .single();

      if (response.error && response.error.code === 'PGRST116') {
        // No rows returned
        return null;
      }

      return DatabaseUtils.parseResponse(response, 'session lookup');
    } catch (error) {
      console.error('Error finding session by ID:', error);
      throw error;
    }
  }

  /**
   * Update session by ID
   */
  static async update(
    id: string,
    updates: Database['public']['Tables']['sessions']['Update']
  ): Promise<Session> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('sessions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'session update');
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * Get sessions by user ID
   */
  static async findByUserId(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<Session[]> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const response = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

      return DatabaseUtils.parseResponse(response, 'sessions lookup by user');
    } catch (error) {
      console.error('Error finding sessions by user ID:', error);
      throw error;
    }
  }

  /**
   * Get recent sessions for user (last 3 for context)
   */
  static async getRecentSessions(userId: string): Promise<Session[]> {
    try {
      return await this.findByUserId(userId, 3, 0);
    } catch (error) {
      console.error('Error getting recent sessions:', error);
      throw error;
    }
  }

  /**
   * Complete a session with summary and emotion
   */
  static async completeSession(
    id: string,
    summary: string,
    emotion?: string,
    durationMinutes?: number
  ): Promise<Session> {
    try {
      const updates: Database['public']['Tables']['sessions']['Update'] = {
        status: 'completed',
        summary: DatabaseUtils.sanitizeInput(summary),
      };

      if (emotion) {
        updates.emotion = DatabaseUtils.sanitizeInput(emotion);
      }

      if (durationMinutes) {
        updates.duration_minutes = durationMinutes;
      }

      return await this.update(id, updates);
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  }

  /**
   * Add transcript to session
   */
  static async addTranscript(id: string, transcript: string): Promise<Session> {
    try {
      return await this.update(id, {
        transcript: DatabaseUtils.sanitizeInput(transcript),
      });
    } catch (error) {
      console.error('Error adding transcript to session:', error);
      throw error;
    }
  }

  /**
   * Get session statistics for a user
   */
  static async getSessionStats(userId: string): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageDuration: number;
    mostCommonEmotion: string | null;
  }> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      // Get total and completed sessions count
      const totalResponse = await supabase
        .from('sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      const completedResponse = await supabase
        .from('sessions')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed');

      // Get average duration
      const durationResponse = await supabase
        .from('sessions')
        .select('duration_minutes')
        .eq('user_id', userId)
        .not('duration_minutes', 'is', null);

      // Get emotion data
      const emotionResponse = await supabase
        .from('sessions')
        .select('emotion')
        .eq('user_id', userId)
        .not('emotion', 'is', null);

      const totalSessions = totalResponse.count || 0;
      const completedSessions = completedResponse.count || 0;

      // Calculate average duration
      const durations = durationResponse.data?.map(s => s.duration_minutes).filter(d => d !== null) || [];
      const averageDuration = durations.length > 0 
        ? durations.reduce((sum, duration) => sum + duration!, 0) / durations.length 
        : 0;

      // Find most common emotion
      const emotions = emotionResponse.data?.map(s => s.emotion).filter(e => e !== null) || [];
      const emotionCounts: Record<string, number> = {};
      emotions.forEach(emotion => {
        if (emotion) {
          emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
        }
      });

      const mostCommonEmotion = Object.keys(emotionCounts).length > 0
        ? Object.keys(emotionCounts).reduce((a, b) => emotionCounts[a] > emotionCounts[b] ? a : b)
        : null;

      return {
        totalSessions,
        completedSessions,
        averageDuration: Math.round(averageDuration * 100) / 100, // Round to 2 decimal places
        mostCommonEmotion,
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw error;
    }
  }

  /**
   * Delete session by ID
   */
  static async delete(id: string): Promise<void> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid session ID format');
      }

      const response = await supabase
        .from('sessions')
        .delete()
        .eq('id', id);

      if (response.error) {
        DatabaseUtils.handleError(response.error, 'session deletion');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }
}
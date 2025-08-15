import { supabase, Goal, Database } from '../supabase';
import { DatabaseUtils, DatabaseError } from '../connection';

export class GoalRepository {
  /**
   * Create a new goal
   */
  static async create(goalData: Database['public']['Tables']['goals']['Insert']): Promise<Goal> {
    try {
      if (!DatabaseUtils.isValidUUID(goalData.user_id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      // Sanitize description
      const sanitizedData = {
        ...goalData,
        description: DatabaseUtils.sanitizeInput(goalData.description),
      };

      const response = await supabase
        .from('goals')
        .insert(sanitizedData)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'goal creation');
    } catch (error) {
      console.error('Error creating goal:', error);
      throw error;
    }
  }

  /**
   * Find goal by ID
   */
  static async findById(id: string): Promise<Goal | null> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid goal ID format');
      }

      const response = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .single();

      if (response.error && response.error.code === 'PGRST116') {
        // No rows returned
        return null;
      }

      return DatabaseUtils.parseResponse(response, 'goal lookup');
    } catch (error) {
      console.error('Error finding goal by ID:', error);
      throw error;
    }
  }

  /**
   * Update goal by ID
   */
  static async update(
    id: string,
    updates: Database['public']['Tables']['goals']['Update']
  ): Promise<Goal> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid goal ID format');
      }

      // Sanitize description if provided
      if (updates.description) {
        updates.description = DatabaseUtils.sanitizeInput(updates.description);
      }

      const response = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'goal update');
    } catch (error) {
      console.error('Error updating goal:', error);
      throw error;
    }
  }

  /**
   * Get goals by user ID
   */
  static async findByUserId(
    userId: string,
    status?: 'active' | 'completed' | 'cancelled',
    limit: number = 10,
    offset: number = 0
  ): Promise<Goal[]> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      let query = supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId);

      if (status) {
        query = query.eq('status', status);
      }

      const response = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      return DatabaseUtils.parseResponse(response, 'goals lookup by user');
    } catch (error) {
      console.error('Error finding goals by user ID:', error);
      throw error;
    }
  }

  /**
   * Get active goals for user
   */
  static async getActiveGoals(userId: string): Promise<Goal[]> {
    try {
      return await this.findByUserId(userId, 'active');
    } catch (error) {
      console.error('Error getting active goals:', error);
      throw error;
    }
  }

  /**
   * Complete a goal
   */
  static async completeGoal(id: string, progressNote?: string): Promise<Goal> {
    try {
      const updates: Database['public']['Tables']['goals']['Update'] = {
        status: 'completed',
      };

      if (progressNote) {
        // Get current goal to append to progress notes
        const currentGoal = await this.findById(id);
        if (currentGoal) {
          const currentNotes = currentGoal.progress_notes || [];
          updates.progress_notes = [...currentNotes, DatabaseUtils.sanitizeInput(progressNote)];
        }
      }

      return await this.update(id, updates);
    } catch (error) {
      console.error('Error completing goal:', error);
      throw error;
    }
  }

  /**
   * Add progress note to goal
   */
  static async addProgressNote(id: string, note: string): Promise<Goal> {
    try {
      const currentGoal = await this.findById(id);
      if (!currentGoal) {
        throw new DatabaseError('Goal not found');
      }

      const currentNotes = currentGoal.progress_notes || [];
      const updatedNotes = [...currentNotes, DatabaseUtils.sanitizeInput(note)];

      return await this.update(id, { progress_notes: updatedNotes });
    } catch (error) {
      console.error('Error adding progress note:', error);
      throw error;
    }
  }

  /**
   * Set target date for goal
   */
  static async setTargetDate(id: string, targetDate: string): Promise<Goal> {
    try {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(targetDate)) {
        throw new DatabaseError('Invalid date format. Use YYYY-MM-DD');
      }

      return await this.update(id, { target_date: targetDate });
    } catch (error) {
      console.error('Error setting target date:', error);
      throw error;
    }
  }

  /**
   * Get goal statistics for a user
   */
  static async getGoalStats(userId: string): Promise<{
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    completionRate: number;
    overdueTasks: number;
  }> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      // Get all goals for user
      const allGoalsResponse = await supabase
        .from('goals')
        .select('status, target_date')
        .eq('user_id', userId);

      const goals = DatabaseUtils.parseResponse(allGoalsResponse, 'goals stats lookup');

      const totalGoals = goals.length;
      const activeGoals = goals.filter(g => g.status === 'active').length;
      const completedGoals = goals.filter(g => g.status === 'completed').length;
      const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

      // Count overdue tasks (active goals with target_date in the past)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const overdueTasks = goals.filter(g => 
        g.status === 'active' && 
        g.target_date && 
        g.target_date < today
      ).length;

      return {
        totalGoals,
        activeGoals,
        completedGoals,
        completionRate: Math.round(completionRate * 100) / 100, // Round to 2 decimal places
        overdueTasks,
      };
    } catch (error) {
      console.error('Error getting goal stats:', error);
      throw error;
    }
  }

  /**
   * Get goals due soon (within next 7 days)
   */
  static async getGoalsDueSoon(userId: string, days: number = 7): Promise<Goal[]> {
    try {
      if (!DatabaseUtils.isValidUUID(userId)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);
      const futureDateStr = futureDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      const response = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .not('target_date', 'is', null)
        .lte('target_date', futureDateStr)
        .order('target_date', { ascending: true });

      return DatabaseUtils.parseResponse(response, 'goals due soon lookup');
    } catch (error) {
      console.error('Error getting goals due soon:', error);
      throw error;
    }
  }

  /**
   * Delete goal by ID
   */
  static async delete(id: string): Promise<void> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid goal ID format');
      }

      const response = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (response.error) {
        DatabaseUtils.handleError(response.error, 'goal deletion');
      }
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw error;
    }
  }

  /**
   * Cancel goal (set status to cancelled)
   */
  static async cancelGoal(id: string, reason?: string): Promise<Goal> {
    try {
      const updates: Database['public']['Tables']['goals']['Update'] = {
        status: 'cancelled',
      };

      if (reason) {
        // Add cancellation reason to progress notes
        const currentGoal = await this.findById(id);
        if (currentGoal) {
          const currentNotes = currentGoal.progress_notes || [];
          updates.progress_notes = [...currentNotes, `Cancelled: ${DatabaseUtils.sanitizeInput(reason)}`];
        }
      }

      return await this.update(id, updates);
    } catch (error) {
      console.error('Error cancelling goal:', error);
      throw error;
    }
  }
}
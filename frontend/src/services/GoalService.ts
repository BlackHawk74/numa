import { Goal } from '../types';
import { apiClient } from '../utils/apiClient';

export interface GoalListResponse {
  goals: Goal[];
  pagination: {
    limit: number;
    offset: number;
    count: number;
  };
  statistics: {
    totalGoals: number;
    activeGoals: number;
    completedGoals: number;
    completionRate: number;
    overdueTasks: number;
  };
}

export interface GoalsDueSoonResponse {
  goals: Goal[];
  daysAhead: number;
  count: number;
}

/**
 * Service for managing therapy goals
 */
export class GoalService {
  private static readonly BASE_URL = '/api/goals';

  /**
   * Get goals for a user
   */
  static async getUserGoals(
    userId: string,
    status?: 'active' | 'completed' | 'cancelled',
    limit: number = 10,
    offset: number = 0
  ): Promise<GoalListResponse> {
    try {
      console.log('Fetching goals for user:', userId, { status, limit, offset });

      const params: any = { limit, offset };
      if (status) {
        params.status = status;
      }

      const response = await apiClient.get(`${this.BASE_URL}/${userId}`, { params });

      return response.data;
    } catch (error) {
      console.error('Error fetching user goals:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch goals: ${error.message}`
          : 'Failed to fetch goals'
      );
    }
  }

  /**
   * Create a new goal
   */
  static async createGoal(
    userId: string,
    description: string,
    targetDate?: string
  ): Promise<Goal> {
    try {
      console.log('Creating goal for user:', userId, { description, targetDate });

      const response = await apiClient.post(this.BASE_URL, {
        userId,
        description,
        targetDate
      });

      if (!response.data.goal) {
        throw new Error('No goal data received from server');
      }

      return response.data.goal;
    } catch (error) {
      console.error('Error creating goal:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to create goal: ${error.message}`
          : 'Failed to create goal'
      );
    }
  }

  /**
   * Get a specific goal by ID
   */
  static async getGoal(goalId: string): Promise<Goal> {
    try {
      console.log('Fetching goal:', goalId);

      const response = await apiClient.get(`${this.BASE_URL}/goal/${goalId}`);

      if (!response.data.goal) {
        throw new Error('No goal data received from server');
      }

      return response.data.goal;
    } catch (error) {
      console.error('Error fetching goal:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch goal: ${error.message}`
          : 'Failed to fetch goal'
      );
    }
  }

  /**
   * Update a goal
   */
  static async updateGoal(
    goalId: string,
    updates: {
      description?: string;
      status?: 'active' | 'completed' | 'cancelled';
      targetDate?: string;
      progressNote?: string;
    }
  ): Promise<Goal> {
    try {
      console.log('Updating goal:', goalId, updates);

      const response = await apiClient.put(`${this.BASE_URL}/${goalId}`, updates);

      if (!response.data.goal) {
        throw new Error('No goal data received from server');
      }

      return response.data.goal;
    } catch (error) {
      console.error('Error updating goal:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to update goal: ${error.message}`
          : 'Failed to update goal'
      );
    }
  }

  /**
   * Complete a goal
   */
  static async completeGoal(goalId: string, progressNote?: string): Promise<Goal> {
    try {
      console.log('Completing goal:', goalId);

      const response = await apiClient.post(`${this.BASE_URL}/${goalId}/complete`, {
        progressNote
      });

      if (!response.data.goal) {
        throw new Error('No goal data received from server');
      }

      return response.data.goal;
    } catch (error) {
      console.error('Error completing goal:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to complete goal: ${error.message}`
          : 'Failed to complete goal'
      );
    }
  }

  /**
   * Add progress note to a goal
   */
  static async addProgressNote(goalId: string, note: string): Promise<Goal> {
    try {
      console.log('Adding progress note to goal:', goalId);

      const response = await apiClient.post(`${this.BASE_URL}/${goalId}/progress`, {
        note
      });

      if (!response.data.goal) {
        throw new Error('No goal data received from server');
      }

      return response.data.goal;
    } catch (error) {
      console.error('Error adding progress note:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to add progress note: ${error.message}`
          : 'Failed to add progress note'
      );
    }
  }

  /**
   * Get goals due soon for a user
   */
  static async getGoalsDueSoon(userId: string, days: number = 7): Promise<GoalsDueSoonResponse> {
    try {
      console.log('Fetching goals due soon for user:', userId, 'within', days, 'days');

      const response = await apiClient.get(`${this.BASE_URL}/${userId}/due-soon`, {
        params: { days }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching goals due soon:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch goals due soon: ${error.message}`
          : 'Failed to fetch goals due soon'
      );
    }
  }

  /**
   * Delete a goal
   */
  static async deleteGoal(goalId: string): Promise<void> {
    try {
      console.log('Deleting goal:', goalId);

      await apiClient.delete(`${this.BASE_URL}/${goalId}`);
    } catch (error) {
      console.error('Error deleting goal:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to delete goal: ${error.message}`
          : 'Failed to delete goal'
      );
    }
  }

  /**
   * Format goal target date for display
   */
  static formatTargetDate(targetDate?: string): string {
    if (!targetDate) return 'No target date';
    
    try {
      const date = new Date(targetDate);
      const now = new Date();
      const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays < 0) {
        return `Overdue by ${Math.abs(diffInDays)} days`;
      } else if (diffInDays === 0) {
        return 'Due today';
      } else if (diffInDays === 1) {
        return 'Due tomorrow';
      } else if (diffInDays < 7) {
        return `Due in ${diffInDays} days`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return 'Invalid date';
    }
  }

  /**
   * Get status display color
   */
  static getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
      active: 'text-blue-500 bg-blue-50',
      completed: 'text-green-500 bg-green-50',
      cancelled: 'text-gray-500 bg-gray-50'
    };

    return statusColors[status] || 'text-gray-500 bg-gray-50';
  }

  /**
   * Get priority level based on target date
   */
  static getPriority(targetDate?: string): 'high' | 'medium' | 'low' | 'none' {
    if (!targetDate) return 'none';
    
    try {
      const date = new Date(targetDate);
      const now = new Date();
      const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffInDays < 0) return 'high'; // Overdue
      if (diffInDays <= 3) return 'high'; // Due within 3 days
      if (diffInDays <= 7) return 'medium'; // Due within a week
      return 'low'; // Due later
    } catch (error) {
      return 'none';
    }
  }

  /**
   * Get priority color
   */
  static getPriorityColor(priority: 'high' | 'medium' | 'low' | 'none'): string {
    const priorityColors: Record<string, string> = {
      high: 'text-red-500',
      medium: 'text-yellow-500',
      low: 'text-green-500',
      none: 'text-gray-400'
    };

    return priorityColors[priority] || 'text-gray-400';
  }

  /**
   * Calculate completion percentage for goals
   */
  static calculateCompletionRate(stats: { totalGoals: number; completedGoals: number }): number {
    if (stats.totalGoals === 0) return 0;
    return Math.round((stats.completedGoals / stats.totalGoals) * 100);
  }
}
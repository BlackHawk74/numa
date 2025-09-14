import { User, Session, Goal } from '../types';
import { apiClient } from '../utils/apiClient';
import { supabase } from '../lib/supabase';

export interface UserContextResponse {
  user: User;
  recentSessions: Session[];
  activeGoals: Goal[];
  context: {
    sessionCount: number;
    goalCount: number;
    lastSessionDate: string | null;
  };
}

/**
 * Service for managing users and user context
 */
export class UserService {
  private static readonly BASE_URL = '/api/users';

  /**
   * Create a new user (authenticated)
   */
  static async createUser(name?: string, preferences?: Record<string, any>): Promise<User> {
    try {
      console.log('Creating new user:', { name, preferences });

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.post(this.BASE_URL, {
        name: name || 'Anonymous User',
        preferences: preferences || {}
      }, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.user) {
        throw new Error('No user data received from server');
      }

      return response.data.user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to create user: ${error.message}`
          : 'Failed to create user'
      );
    }
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<User> {
    try {
      console.log('Fetching current user');

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.get(`${this.BASE_URL}/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.user) {
        throw new Error('No user data received from server');
      }

      return response.data.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch user: ${error.message}`
          : 'Failed to fetch user'
      );
    }
  }

  /**
   * Update current authenticated user
   */
  static async updateUser(
    updates: {
      name?: string;
      preferences?: Record<string, any>;
    }
  ): Promise<User> {
    try {
      console.log('Updating user:', updates);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.put(`${this.BASE_URL}/me`, updates, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.data.user) {
        throw new Error('No user data received from server');
      }

      return response.data.user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to update user: ${error.message}`
          : 'Failed to update user'
      );
    }
  }

  /**
   * Get current user with context (recent sessions and active goals)
   */
  static async getUserContext(): Promise<UserContextResponse> {
    try {
      console.log('Fetching user context');

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await apiClient.get(`${this.BASE_URL}/me/context`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching user context:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to fetch user context: ${error.message}`
          : 'Failed to fetch user context'
      );
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    preferences: Record<string, any>
  ): Promise<User> {
    try {
      return await this.updateUser({ preferences });
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Initialize authenticated user session
   */
  static async initializeUser(): Promise<{
    user: User;
    isNewUser: boolean;
    context?: UserContextResponse;
  }> {
    try {
      console.log('UserService.initializeUser: Starting...');
      
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      console.log('UserService.initializeUser: User authenticated, ID:', session.user.id);

      try {
        // Try to get existing user context
        console.log('UserService.initializeUser: Checking for existing user...');
        const context = await this.getUserContext();
        console.log('UserService.initializeUser: Found existing user');
        return {
          user: context.user,
          isNewUser: false,
          context
        };
      } catch (error) {
        console.warn('UserService.initializeUser: User not found in database, creating new record:', error);
        
        // Create user record in our database
        console.log('UserService.initializeUser: Creating new user record...');
        const user = await this.createUser(
          session.user.user_metadata?.name
        );

        console.log('UserService.initializeUser: New user created:', user.id);
        return {
          user,
          isNewUser: true
        };
      }
    } catch (error) {
      console.error('UserService.initializeUser: Error:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to initialize user: ${error.message}`
          : 'Failed to initialize user'
      );
    }
  }

  /**
   * Get current authenticated user ID
   */
  static async getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  }

  /**
   * Check if user has completed onboarding
   */
  static hasCompletedOnboarding(user: User): boolean {
    return user.preferences?.onboardingCompleted === true;
  }

  /**
   * Mark onboarding as completed
   */
  static async completeOnboarding(): Promise<User> {
    try {
      const currentUser = await this.getCurrentUser();
      const currentPreferences = currentUser.preferences || {};
      
      return await this.updatePreferences({
        ...currentPreferences,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Get user display name
   */
  static getDisplayName(user: User): string {
    return user.name || 'Anonymous User';
  }

  /**
   * Format user join date
   */
  static formatJoinDate(user: User): string {
    if (!user.created_at) return 'Unknown';
    
    try {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * Get user therapy streak (consecutive days with sessions)
   */
  static calculateTherapyStreak(sessions: Session[]): number {
    if (sessions.length === 0) return 0;

    // Sort sessions by date (most recent first)
    const sortedSessions = sessions
      .filter(s => s.status === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedSessions.length === 0) return 0;

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0); // Start of today

    for (const session of sortedSessions) {
      const sessionDate = new Date(session.date);
      sessionDate.setHours(0, 0, 0, 0); // Start of session day

      const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === streak) {
        // Session is on the expected day
        streak++;
        currentDate.setDate(currentDate.getDate() - 1); // Move to previous day
      } else if (daysDiff > streak) {
        // Gap in sessions, streak is broken
        break;
      }
      // If daysDiff < streak, it means multiple sessions on the same day, continue
    }

    return streak;
  }
}
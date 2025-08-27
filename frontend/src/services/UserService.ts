import { User, Session, Goal } from '../types';
import { apiClient } from '../utils/apiClient';

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
   * Create a new user (registration)
   */
  static async createUser(name?: string, preferences?: Record<string, any>): Promise<User> {
    try {
      console.log('Creating new user:', { name, preferences });

      const response = await apiClient.post(this.BASE_URL, {
        name: name || 'Anonymous User',
        preferences: preferences || {}
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
   * Get a user by ID
   */
  static async getUser(userId: string): Promise<User> {
    try {
      console.log('Fetching user:', userId);

      const response = await apiClient.get(`${this.BASE_URL}/${userId}`);

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
   * Update a user
   */
  static async updateUser(
    userId: string,
    updates: {
      name?: string;
      preferences?: Record<string, any>;
    }
  ): Promise<User> {
    try {
      console.log('Updating user:', userId, updates);

      const response = await apiClient.put(`${this.BASE_URL}/${userId}`, updates);

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
   * Get user with context (recent sessions and active goals)
   */
  static async getUserContext(userId: string): Promise<UserContextResponse> {
    try {
      console.log('Fetching user context:', userId);

      const response = await apiClient.get(`${this.BASE_URL}/${userId}/context`);

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
    userId: string,
    preferences: Record<string, any>
  ): Promise<User> {
    try {
      return await this.updateUser(userId, { preferences });
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Initialize user session (create user if needed and get context)
   */
  static async initializeUser(name?: string): Promise<{
    user: User;
    isNewUser: boolean;
    context?: UserContextResponse;
  }> {
    try {
      // Check if user exists in localStorage
      const existingUserId = localStorage.getItem('numa_user_id');
      
      if (existingUserId) {
        try {
          // Try to get existing user context
          const context = await this.getUserContext(existingUserId);
          return {
            user: context.user,
            isNewUser: false,
            context
          };
        } catch (error) {
          console.warn('Failed to load existing user, creating new one:', error);
          // Clear invalid user ID
          localStorage.removeItem('numa_user_id');
        }
      }

      // Create new user
      const user = await this.createUser(name);
      
      // Store user ID for future sessions
      localStorage.setItem('numa_user_id', user.id);

      return {
        user,
        isNewUser: true
      };
    } catch (error) {
      console.error('Error initializing user:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to initialize user: ${error.message}`
          : 'Failed to initialize user'
      );
    }
  }

  /**
   * Get current user from localStorage
   */
  static getCurrentUserId(): string | null {
    return localStorage.getItem('numa_user_id');
  }

  /**
   * Clear current user session
   */
  static clearCurrentUser(): void {
    localStorage.removeItem('numa_user_id');
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
  static async completeOnboarding(userId: string): Promise<User> {
    try {
      const currentPreferences = await this.getUser(userId).then(u => u.preferences || {});
      
      return await this.updatePreferences(userId, {
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
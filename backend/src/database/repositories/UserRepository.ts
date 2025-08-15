import { supabase, User, Database } from '../supabase';
import { DatabaseUtils, DatabaseError } from '../connection';

export class UserRepository {
  /**
   * Create a new user
   */
  static async create(userData: Database['public']['Tables']['users']['Insert']): Promise<User> {
    try {
      const response = await supabase
        .from('users')
        .insert(userData)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'user creation');
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Find user by ID
   */
  static async findById(id: string): Promise<User | null> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const response = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (response.error && response.error.code === 'PGRST116') {
        // No rows returned
        return null;
      }

      return DatabaseUtils.parseResponse(response, 'user lookup');
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  /**
   * Update user by ID
   */
  static async update(
    id: string,
    updates: Database['public']['Tables']['users']['Update']
  ): Promise<User> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const response = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      return DatabaseUtils.parseResponse(response, 'user update');
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  /**
   * Delete user by ID
   */
  static async delete(id: string): Promise<void> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      const response = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (response.error) {
        DatabaseUtils.handleError(response.error, 'user deletion');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Find or create user (useful for authentication flows)
   */
  static async findOrCreate(userData: Database['public']['Tables']['users']['Insert']): Promise<User> {
    try {
      // Try to find existing user first
      if (userData.id) {
        const existingUser = await this.findById(userData.id);
        if (existingUser) {
          return existingUser;
        }
      }

      // Create new user if not found
      return await this.create(userData);
    } catch (error) {
      console.error('Error in findOrCreate user:', error);
      throw error;
    }
  }

  /**
   * Update user preferences
   */
  static async updatePreferences(
    id: string,
    preferences: Record<string, any>
  ): Promise<User> {
    try {
      return await this.update(id, { preferences });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Get user with their recent sessions and active goals
   */
  static async getUserWithContext(id: string): Promise<{
    user: User;
    recentSessions: any[];
    activeGoals: any[];
  }> {
    try {
      if (!DatabaseUtils.isValidUUID(id)) {
        throw new DatabaseError('Invalid user ID format');
      }

      // Get user data
      const user = await this.findById(id);
      if (!user) {
        throw new DatabaseError('User not found');
      }

      // Get recent sessions (last 3)
      const sessionsResponse = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', id)
        .order('date', { ascending: false })
        .limit(3);

      // Get active goals
      const goalsResponse = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      return {
        user,
        recentSessions: sessionsResponse.data || [],
        activeGoals: goalsResponse.data || [],
      };
    } catch (error) {
      console.error('Error getting user with context:', error);
      throw error;
    }
  }
}
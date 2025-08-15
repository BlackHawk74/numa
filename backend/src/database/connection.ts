import { supabase } from './supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Custom error types for better error handling
export class DatabaseError extends Error {
  public code?: string;
  public details?: string;
  public hint?: string;

  constructor(message: string, postgrestError?: PostgrestError) {
    super(message);
    this.name = 'DatabaseError';
    
    if (postgrestError) {
      this.code = postgrestError.code;
      this.details = postgrestError.details;
      this.hint = postgrestError.hint;
    }
  }
}

export class ConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConnectionError';
  }
}

// Database connection utilities
export class DatabaseConnection {
  /**
   * Test database connection and basic functionality
   */
  static async testConnection(): Promise<boolean> {
    try {
      // Try to query the users table - if it exists, connection is good
      const { data, error } = await supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        // If the table doesn't exist, that's expected before migration
        if (error.code === 'PGRST205' && error.message.includes('users')) {
          console.log('Database connection successful (tables not yet created)');
          return true;
        }
        console.error('Database connection test failed:', error);
        throw new ConnectionError(`Database connection failed: ${error.message}`);
      }

      console.log('Database connection test successful');
      return true;
    } catch (error) {
      console.error('Database connection test error:', error);
      throw new ConnectionError(`Database connection test failed: ${error}`);
    }
  }

  /**
   * Execute database migration scripts
   * Note: In production, this should be handled by Supabase migrations
   */
  static async runMigrations(): Promise<void> {
    try {
      // For now, we'll just test the connection
      // In a real scenario, you'd run the SQL migration files
      await this.testConnection();
      console.log('Database migrations check completed');
    } catch (error) {
      console.error('Migration error:', error);
      throw new DatabaseError(`Migration failed: ${error}`);
    }
  }

  /**
   * Health check for database
   */
  static async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    message: string;
    timestamp: string;
  }> {
    try {
      await this.testConnection();
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Database connection failed: ${error}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Utility functions for common database operations
export class DatabaseUtils {
  /**
   * Handle Supabase errors and convert to custom error types
   */
  static handleError(error: PostgrestError | null, operation: string): never {
    if (!error) {
      throw new DatabaseError(`Unknown error during ${operation}`);
    }

    const message = `Database ${operation} failed: ${error.message}`;
    throw new DatabaseError(message, error);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Sanitize user input for database operations
   */
  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') {
      return '';
    }
    // Basic sanitization - remove null bytes and trim
    return input.replace(/\0/g, '').trim();
  }

  /**
   * Format database timestamps for consistent handling
   */
  static formatTimestamp(date: Date = new Date()): string {
    return date.toISOString();
  }

  /**
   * Parse database response and handle errors
   */
  static parseResponse<T>(
    response: { data: T | null; error: PostgrestError | null },
    operation: string
  ): T {
    const { data, error } = response;

    if (error) {
      this.handleError(error, operation);
    }

    if (data === null) {
      throw new DatabaseError(`No data returned from ${operation}`);
    }

    return data;
  }

  /**
   * Retry database operations with exponential backoff
   */
  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new DatabaseError(`Database operation failed after ${maxRetries} attempts: ${lastError!.message}`);
  }
}

// Initialize database connection on module load
let connectionInitialized = false;

export async function initializeDatabase(): Promise<void> {
  if (connectionInitialized) {
    return;
  }

  try {
    console.log('Initializing database connection...');
    await DatabaseConnection.testConnection();
    await DatabaseConnection.runMigrations();
    connectionInitialized = true;
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

// Export the supabase client for direct use
export { supabase };
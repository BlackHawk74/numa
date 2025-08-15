// Database exports for easy importing
export * from './supabase';
export * from './connection';

// Repository exports
export { UserRepository } from './repositories/UserRepository';
export { SessionRepository } from './repositories/SessionRepository';
export { GoalRepository } from './repositories/GoalRepository';

// Re-export commonly used types and utilities
export type { User, Session, Goal, Database } from './supabase';
export { 
  DatabaseConnection, 
  DatabaseUtils, 
  DatabaseError, 
  ConnectionError,
  initializeDatabase 
} from './connection';
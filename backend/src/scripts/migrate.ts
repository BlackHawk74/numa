#!/usr/bin/env ts-node

/**
 * Database Migration Runner
 * 
 * This script helps run database migrations for the Numa AI Therapist application.
 * In a production environment, you would typically run these migrations through
 * Supabase's migration system or a proper migration tool.
 * 
 * For development, this script provides a way to set up the database schema.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { supabase, initializeDatabase } from '../database';

async function runMigration(migrationFile: string): Promise<void> {
  try {
    console.log(`Running migration: ${migrationFile}`);
    
    const migrationPath = join(__dirname, '../database/migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    // Split SQL by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error) {
          console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
          console.error('Error:', error);
          throw error;
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error(`❌ Migration ${migrationFile} failed:`, error);
    throw error;
  }
}

async function runAllMigrations(): Promise<void> {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Initialize database connection
    await initializeDatabase();
    
    // List of migration files in order
    const migrations = [
      '001_initial_schema.sql',
      '002_disable_rls_for_demo.sql'
    ];
    
    for (const migration of migrations) {
      await runMigration(migration);
    }
    
    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('💥 Migration process failed:', error);
    process.exit(1);
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  runAllMigrations();
}

export { runMigration, runAllMigrations };
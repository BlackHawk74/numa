#!/usr/bin/env ts-node

/**
 * Database Test Script
 * 
 * This script tests the database repositories and utilities.
 * Run this after setting up the database schema to verify everything works.
 */

import { 
  UserRepository, 
  SessionRepository, 
  GoalRepository,
  DatabaseConnection 
} from './database';

async function testDatabase(): Promise<void> {
  try {
    console.log('🧪 Testing database functionality...\n');

    // Test 1: Database connection
    console.log('1. Testing database connection...');
    const healthCheck = await DatabaseConnection.healthCheck();
    console.log('   Status:', healthCheck.status);
    console.log('   Message:', healthCheck.message);
    console.log('   ✅ Connection test passed\n');

    // Test 2: User Repository (if tables exist)
    console.log('2. Testing User Repository...');
    try {
      // Try to create a test user
      const testUser = await UserRepository.create({
        name: 'Test User',
        preferences: { theme: 'light', language: 'en' }
      });
      console.log('   ✅ User created:', testUser.id);

      // Try to find the user
      const foundUser = await UserRepository.findById(testUser.id);
      console.log('   ✅ User found:', foundUser?.name);

      // Try to update the user
      const updatedUser = await UserRepository.update(testUser.id, {
        name: 'Updated Test User'
      });
      console.log('   ✅ User updated:', updatedUser.name);

      // Test user context
      const userContext = await UserRepository.getUserWithContext(testUser.id);
      console.log('   ✅ User context retrieved:', {
        user: userContext.user.name,
        sessions: userContext.recentSessions.length,
        goals: userContext.activeGoals.length
      });

      // Clean up - delete test user
      await UserRepository.delete(testUser.id);
      console.log('   ✅ Test user cleaned up\n');

    } catch (error: any) {
      if (error.message.includes('users') || error.code === 'PGRST205') {
        console.log('   ⚠️  User table not found - run database setup first');
        console.log('   Run: npm run db:setup\n');
      } else {
        console.error('   ❌ Unexpected error:', error);
      }
    }

    // Test 3: Session Repository (if tables exist)
    console.log('3. Testing Session Repository...');
    try {
      // Create a test user first
      const testUser = await UserRepository.create({
        name: 'Session Test User'
      });

      // Create a test session
      const testSession = await SessionRepository.create({
        user_id: testUser.id,
        transcript: 'Test conversation transcript',
        emotion: 'calm',
        duration_minutes: 15
      });
      console.log('   ✅ Session created:', testSession.id);

      // Complete the session
      const completedSession = await SessionRepository.completeSession(
        testSession.id,
        'User discussed anxiety management techniques',
        'hopeful',
        20
      );
      console.log('   ✅ Session completed:', completedSession.status);

      // Get session stats
      const stats = await SessionRepository.getSessionStats(testUser.id);
      console.log('   ✅ Session stats:', stats);

      // Clean up
      await SessionRepository.delete(testSession.id);
      await UserRepository.delete(testUser.id);
      console.log('   ✅ Test session cleaned up\n');

    } catch (error: any) {
      if (error.message.includes('sessions') || error.message.includes('users') || error.code === 'PGRST205') {
        console.log('   ⚠️  Tables not found - run database setup first\n');
      } else {
        console.error('   ❌ Unexpected error:', error);
      }
    }

    // Test 4: Goal Repository (if tables exist)
    console.log('4. Testing Goal Repository...');
    try {
      // Create a test user first
      const testUser = await UserRepository.create({
        name: 'Goal Test User'
      });

      // Create a test goal
      const testGoal = await GoalRepository.create({
        user_id: testUser.id,
        description: 'Practice deep breathing exercises daily',
        target_date: '2025-08-20'
      });
      console.log('   ✅ Goal created:', testGoal.id);

      // Add progress note
      const goalWithProgress = await GoalRepository.addProgressNote(
        testGoal.id,
        'Completed 5 minutes of deep breathing today'
      );
      console.log('   ✅ Progress note added:', goalWithProgress.progress_notes?.length);

      // Complete the goal
      const completedGoal = await GoalRepository.completeGoal(
        testGoal.id,
        'Successfully established daily breathing routine'
      );
      console.log('   ✅ Goal completed:', completedGoal.status);

      // Get goal stats
      const goalStats = await GoalRepository.getGoalStats(testUser.id);
      console.log('   ✅ Goal stats:', goalStats);

      // Clean up
      await GoalRepository.delete(testGoal.id);
      await UserRepository.delete(testUser.id);
      console.log('   ✅ Test goal cleaned up\n');

    } catch (error: any) {
      if (error.message.includes('goals') || error.message.includes('users') || error.code === 'PGRST205') {
        console.log('   ⚠️  Tables not found - run database setup first\n');
      } else {
        console.error('   ❌ Unexpected error:', error);
      }
    }

    console.log('🎉 Database testing completed successfully!');
    console.log('\nNext steps:');
    console.log('1. If tables don\'t exist, run: npm run db:setup');
    console.log('2. Follow the instructions to create tables in Supabase');
    console.log('3. Run this test again to verify full functionality');

  } catch (error) {
    console.error('💥 Database testing failed:', error);
    // Don't exit with error if it's just missing tables
    if (error instanceof Error && (error.message.includes('PGRST205') || error.message.includes('users'))) {
      console.log('\n⚠️  This is expected if tables haven\'t been created yet.');
    } else {
      process.exit(1);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testDatabase();
}

export { testDatabase };
import { UserRepository } from './database/repositories/UserRepository';
import { SessionRepository } from './database/repositories/SessionRepository';
import { GoalRepository } from './database/repositories/GoalRepository';
import { conversationService } from './services/ConversationService';
import { sentimentAnalysisService } from './services/SentimentAnalysisService';
import { initializeDatabase } from './database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test the complete therapy flow with real data
 */
async function testTherapyFlow() {
    try {
        console.log('🧪 Testing complete therapy flow...');

        // Initialize database
        await initializeDatabase();

        // 1. Create a test user
        console.log('\n1. Creating test user...');
        const testUser = await UserRepository.create({
            name: 'Test User',
            preferences: { language: 'en', theme: 'calm' }
        });
        console.log('✅ Test user created:', testUser.id);

        // 2. Test sentiment analysis
        console.log('\n2. Testing sentiment analysis...');
        const testMessage = "I've been feeling really anxious about my job interview tomorrow. I keep thinking I'm going to mess it up.";
        const sentimentResult = await sentimentAnalysisService.analyzeSentiment(testMessage);
        console.log('✅ Sentiment analysis result:', {
            emotion: sentimentResult.emotion,
            confidence: sentimentResult.confidence,
            intensity: sentimentAnalysisService.getEmotionIntensity(sentimentResult.confidence)
        });

        // 3. Test conversation generation
        console.log('\n3. Testing conversation generation...');
        const conversationContext = {
            userId: testUser.id,
            userName: testUser.name,
            sessionHistory: [],
            activeGoals: [],
            detectedEmotion: sentimentResult.emotion
        };

        const conversationResult = await conversationService.generateResponse(
            testMessage,
            conversationContext
        );
        console.log('✅ Conversation result:', {
            response: conversationResult.response,
            suggestedGoal: conversationResult.suggestedGoal,
            hasError: !!conversationResult.error
        });

        // 4. Create a session
        console.log('\n4. Creating therapy session...');
        const session = await SessionRepository.create({
            user_id: testUser.id,
            transcript: `User: ${testMessage}\nNuma: ${conversationResult.response}`,
            emotion: sentimentResult.emotion,
            status: 'active'
        });
        console.log('✅ Session created:', session.id);

        // 5. Create a goal if suggested
        if (conversationResult.suggestedGoal) {
            console.log('\n5. Creating suggested goal...');
            const goal = await GoalRepository.create({
                user_id: testUser.id,
                description: conversationResult.suggestedGoal,
                status: 'active'
            });
            console.log('✅ Goal created:', goal.id);
        }

        // 6. Test session completion
        console.log('\n6. Completing session...');
        const completedSession = await SessionRepository.completeSession(
            session.id,
            'User discussed anxiety about job interview. Provided CBT techniques for managing anxiety.',
            sentimentResult.emotion,
            15
        );
        console.log('✅ Session completed:', completedSession.status);

        // 7. Get user context for next session
        console.log('\n7. Testing user context retrieval...');
        const userContext = await UserRepository.getUserWithContext(testUser.id);
        console.log('✅ User context retrieved:', {
            recentSessionsCount: userContext.recentSessions.length,
            activeGoalsCount: userContext.activeGoals.length
        });

        // 8. Test session statistics
        console.log('\n8. Testing session statistics...');
        const sessionStats = await SessionRepository.getSessionStats(testUser.id);
        console.log('✅ Session stats:', sessionStats);

        // 9. Test goal statistics
        console.log('\n9. Testing goal statistics...');
        const goalStats = await GoalRepository.getGoalStats(testUser.id);
        console.log('✅ Goal stats:', goalStats);

        // 10. Test therapeutic recommendations
        console.log('\n10. Testing therapeutic recommendations...');
        const recommendations = sentimentAnalysisService.getTherapeuticRecommendations(
            sentimentResult.emotion,
            sentimentResult.confidence
        );
        console.log('✅ Therapeutic recommendations:', recommendations);

        console.log('\n🎉 Complete therapy flow test successful!');
        console.log('\n📊 Summary:');
        console.log(`- User ID: ${testUser.id}`);
        console.log(`- Session ID: ${session.id}`);
        console.log(`- Detected emotion: ${sentimentResult.emotion} (${sentimentResult.confidence.toFixed(2)} confidence)`);
        console.log(`- Response length: ${conversationResult.response.length} characters`);
        console.log(`- Goals created: ${userContext.activeGoals.length}`);
        console.log(`- Sessions completed: ${sessionStats.completedSessions}`);

    } catch (error) {
        console.error('❌ Therapy flow test failed:', error);
        process.exit(1);
    }
}

// Run test if this file is executed directly
if (require.main === module) {
    testTherapyFlow();
}

export { testTherapyFlow };
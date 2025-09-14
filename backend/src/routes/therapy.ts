import { Router, Request, Response } from 'express';
import { conversationService } from '../services/ConversationService';
import { sentimentAnalysisService } from '../services/SentimentAnalysisService';
import { sessionSummaryService } from '../services/SessionSummaryService';
import { UserRepository } from '../database/repositories/UserRepository';
import { SessionRepository } from '../database/repositories/SessionRepository';
import { GoalRepository } from '../database/repositories/GoalRepository';
import { MessageRepository } from '../database/repositories/MessageRepository';

const router = Router();

interface TherapyRequest {
  userId: string;
  message: string;
  sessionId?: string;
  userName?: string;
}

/**
 * POST /api/therapy
 * Handle CBT conversation with sentiment analysis and context
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, message, sessionId, userName }: TherapyRequest = req.body;

    // Validate required fields
    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId and message are required'
      });
    }

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid message',
        message: 'Message must be a non-empty string'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID format',
        message: 'userId must be a valid UUID'
      });
    }

    console.log(`Processing therapy request for user: ${userId}`);

    // Get user context (recent sessions and active goals)
    const userContext = await UserRepository.getUserWithContext(userId);
    
    // Perform sentiment analysis on user message
    const sentimentResult = await sentimentAnalysisService.analyzeSentiment(message);
    
    // Get conversation history from messages table
    let conversationHistory: string[] = [];
    if (sessionId) {
      const recentMessages = await MessageRepository.getConversationHistory(userId, sessionId, 10);
      conversationHistory = recentMessages.map(msg => `${msg.speaker}: ${msg.content}`);
    } else {
      // Get recent messages from user's last sessions
      const recentMessages = await MessageRepository.getConversationHistory(userId, undefined, 6);
      conversationHistory = recentMessages.map(msg => `${msg.speaker}: ${msg.content}`);
    }
    
    // Prepare conversation context
    const conversationContext = {
      userId,
      userName: userName || userContext.user.name || 'User',
      sessionHistory: conversationHistory,
      activeGoals: userContext.activeGoals.map(goal => goal.description),
      detectedEmotion: sentimentResult.emotion
    };

    // Handle session management first
    let currentSession;
    let conversationLength = 0;
    
    if (sessionId) {
      // Get existing session
      currentSession = await SessionRepository.findById(sessionId);
      if (currentSession) {
        // Get conversation length from messages count
        const sessionMessages = await MessageRepository.findBySessionId(sessionId);
        conversationLength = Math.floor(sessionMessages.length / 2); // Divide by 2 for user/AI pairs
      }
    }

    // Check if session should be concluded (only for existing sessions with substantial content)
    const shouldConclude = currentSession && conversationLength > 2 ? 
      conversationService.shouldConcludeSession(
        conversationLength,
        currentSession?.duration_minutes,
        message
      ) : false;

    // Generate therapeutic response (use conclusion method if appropriate)
    const conversationResult = shouldConclude
      ? await conversationService.generateSessionConclusion(message, conversationContext, {
          maxTokens: 150,
          temperature: 0.7
        })
      : await conversationService.generateResponse(message, conversationContext, {
          maxTokens: 150,
          temperature: 0.7
        });

    if (conversationResult.error) {
      return res.status(500).json({
        error: 'Conversation generation failed',
        message: conversationResult.error,
        response: conversationResult.response
      });
    }

    // Update or create session with conversation
    if (sessionId && currentSession) {
      // Store individual messages in the messages table
      await MessageRepository.createConversationPair(
        sessionId,
        userId,
        message,
        conversationResult.response,
        sentimentResult.emotion,
        sentimentResult.confidence,
        {
          shouldConclude,
          conversationLength: conversationLength + 1
        }
      );
      
      // Update session emotion if needed
      if (sentimentResult.emotion && sentimentResult.emotion !== currentSession.emotion) {
        await SessionRepository.update(sessionId, {
          emotion: sentimentResult.emotion
        });
      }
    } else {
      // Create new session
      currentSession = await SessionRepository.create({
        user_id: userId,
        emotion: sentimentResult.emotion,
        status: 'active'
      });
      
      // Store the first conversation pair
      await MessageRepository.createConversationPair(
        currentSession.id,
        userId,
        message,
        conversationResult.response,
        sentimentResult.emotion,
        sentimentResult.confidence,
        {
          shouldConclude,
          conversationLength: 1
        }
      );
    }

    // Create goal if suggested
    if (conversationResult.suggestedGoal) {
      try {
        await GoalRepository.create({
          user_id: userId,
          description: conversationResult.suggestedGoal,
          status: 'active'
        });
      } catch (goalError) {
        console.error('Error creating suggested goal:', goalError);
        // Don't fail the request if goal creation fails
      }
    }

    // Return response
    res.json({
      response: conversationResult.response,
      emotion: sentimentResult.emotion,
      emotionConfidence: sentimentResult.confidence,
      sessionId: currentSession?.id,
      goal: conversationResult.suggestedGoal,
      shouldConcludeSession: shouldConclude,
      therapeuticRecommendations: sentimentAnalysisService.getTherapeuticRecommendations(
        sentimentResult.emotion,
        sentimentResult.confidence
      ),
      context: {
        recentSessionsCount: userContext.recentSessions.length,
        activeGoalsCount: userContext.activeGoals.length,
        emotionIntensity: sentimentAnalysisService.getEmotionIntensity(sentimentResult.confidence),
        conversationLength: conversationLength
      }
    });

  } catch (error) {
    console.error('Therapy endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      response: "I'm having trouble processing your message right now. Could you please try again?"
    });
  }
});

/**
 * POST /api/therapy/conclude
 * Conclude a therapy session with summary generation
 */
router.post('/conclude', async (req: Request, res: Response) => {
  try {
    const { sessionId, userId } = req.body;

    if (!sessionId || !userId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'sessionId and userId are required'
      });
    }

    // Get the session
    const session = await SessionRepository.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    // Verify session belongs to user
    if (session.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'Session does not belong to the specified user'
      });
    }

    // Generate session summary
    const summaryResult = await sessionSummaryService.generateSummary(
      session.transcript || '',
      session.emotion || undefined,
      session.duration_minutes || undefined
    );

    // Update session with summary and mark as completed
    const updatedSession = await SessionRepository.completeSession(
      sessionId,
      summaryResult.summary,
      session.emotion || 'neutral'
    );

    // Generate context summary for future sessions
    const contextSummary = await sessionSummaryService.generateContextSummary(
      session.transcript || '',
      session.emotion || undefined
    );

    res.json({
      sessionId: updatedSession.id,
      summary: summaryResult.summary,
      keyInsights: summaryResult.keyInsights,
      emotionalState: summaryResult.emotionalState,
      progressNotes: summaryResult.progressNotes,
      contextSummary,
      status: updatedSession.status,
      error: summaryResult.error
    });

  } catch (error) {
    console.error('Session conclusion error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/therapy/info
 * Get information about the therapy service
 */
router.get('/info', (req: Request, res: Response) => {
  res.json({
    service: 'CBT Therapy Conversation',
    conversationModel: 'meta-llama/Llama-3.1-8B-Instruct',
    sentimentModel: 'j-hartmann/emotion-english-distilroberta-base',
    summaryModel: 'meta-llama/Llama-3.1-8B-Instruct',
    features: [
      'Cognitive Behavioral Therapy techniques',
      'Sentiment analysis and mood adaptation',
      'Session memory and context',
      'Goal generation and tracking',
      'Therapeutic recommendations',
      'AI-powered session summaries',
      'Conversation phase adaptation'
    ],
    supportedEmotions: ['happy', 'sad', 'angry', 'anxious', 'surprised', 'disgusted', 'neutral'],
    endpoints: {
      conversation: '/api/therapy',
      sessionConclusion: '/api/therapy/conclude',
      info: '/api/therapy/info'
    }
  });
});

export default router;
import { Router, Request, Response } from 'express';
import { MessageRepository } from '../database/repositories/MessageRepository';

const router = Router();

/**
 * GET /api/messages/session/:sessionId
 * Get all messages for a specific session
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
    try {
        const { sessionId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing session ID',
                message: 'Session ID is required'
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID format',
                message: 'sessionId must be a valid UUID'
            });
        }

        console.log(`Fetching messages for session: ${sessionId}`);

        const messages = await MessageRepository.findBySessionId(
            sessionId,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            messages,
            count: messages.length,
            sessionId
        });

    } catch (error) {
        console.error('Get session messages endpoint error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

/**
 * GET /api/messages/user/:userId
 * Get messages for a user across all sessions
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { limit = 100, offset = 0 } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing user ID',
                message: 'User ID is required'
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

        console.log(`Fetching messages for user: ${userId}`);

        const messages = await MessageRepository.findByUserId(
            userId,
            parseInt(limit as string),
            parseInt(offset as string)
        );

        res.json({
            messages,
            count: messages.length,
            userId
        });

    } catch (error) {
        console.error('Get user messages endpoint error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

/**
 * GET /api/messages/conversation/:userId
 * Get conversation history for AI context (all sessions)
 */
router.get('/conversation/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { maxMessages = 20 } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing user ID',
                message: 'User ID is required'
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

        console.log(`Fetching conversation history for user: ${userId}`);

        const conversationHistory = await MessageRepository.getConversationHistory(
            userId,
            undefined,
            parseInt(maxMessages as string)
        );

        res.json({
            conversationHistory,
            count: conversationHistory.length,
            userId,
            sessionId: null
        });

    } catch (error) {
        console.error('Get conversation history endpoint error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

/**
 * GET /api/messages/conversation/:userId/:sessionId
 * Get conversation history for AI context (specific session)
 */
router.get('/conversation/:userId/:sessionId', async (req: Request, res: Response) => {
    try {
        const { userId, sessionId } = req.params;
        const { maxMessages = 20 } = req.query;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing user ID',
                message: 'User ID is required'
            });
        }

        if (!sessionId) {
            return res.status(400).json({
                error: 'Missing session ID',
                message: 'Session ID is required'
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

        if (!uuidRegex.test(sessionId)) {
            return res.status(400).json({
                error: 'Invalid session ID format',
                message: 'sessionId must be a valid UUID'
            });
        }

        console.log(`Fetching conversation history for user: ${userId}, session: ${sessionId}`);

        const conversationHistory = await MessageRepository.getConversationHistory(
            userId,
            sessionId,
            parseInt(maxMessages as string)
        );

        res.json({
            conversationHistory,
            count: conversationHistory.length,
            userId,
            sessionId
        });

    } catch (error) {
        console.error('Get conversation history endpoint error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

/**
 * GET /api/messages/stats/:userId
 * Get message statistics for a user
 */
router.get('/stats/:userId', async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                error: 'Missing user ID',
                message: 'User ID is required'
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

        console.log(`Fetching message statistics for user: ${userId}`);

        const stats = await MessageRepository.getMessageStats(userId);

        res.json({
            stats,
            userId
        });

    } catch (error) {
        console.error('Get message stats endpoint error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

/**
 * POST /api/messages
 * Create a new message (for testing purposes)
 */
router.post('/', async (req: Request, res: Response) => {
    try {
        const { sessionId, userId, speaker, content, emotion, emotionConfidence, metadata } = req.body;

        // Validate required fields
        if (!sessionId || !userId || !speaker || !content) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'sessionId, userId, speaker, and content are required'
            });
        }

        if (!['user', 'numa', 'system'].includes(speaker)) {
            return res.status(400).json({
                error: 'Invalid speaker',
                message: 'speaker must be one of: user, numa, system'
            });
        }

        console.log(`Creating message for session: ${sessionId}`);

        const message = await MessageRepository.create({
            session_id: sessionId,
            user_id: userId,
            speaker,
            content,
            emotion,
            emotion_confidence: emotionConfidence,
            timestamp: new Date().toISOString(),
            metadata: metadata || {}
        });

        res.status(201).json({
            message,
            success: true
        });

    } catch (error) {
        console.error('Create message endpoint error:', error);

        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error occurred'
        });
    }
});

export default router;
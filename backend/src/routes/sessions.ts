import { Router, Request, Response } from 'express';
import { SessionRepository } from '../database/repositories/SessionRepository';
import { UserRepository } from '../database/repositories/UserRepository';

const router = Router();

/**
 * GET /api/sessions/:userId
 * Get sessions for a specific user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

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

    console.log(`Fetching sessions for user: ${userId}, limit: ${limit}, offset: ${offset}`);

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Get sessions
    const sessions = await SessionRepository.findByUserId(userId, limit, offset);
    
    // Get session statistics
    const stats = await SessionRepository.getSessionStats(userId);

    res.json({
      sessions,
      pagination: {
        limit,
        offset,
        count: sessions.length
      },
      statistics: stats
    });

  } catch (error) {
    console.error('Get sessions endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, transcript, emotion } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'userId is required'
      });
    }

    console.log(`Creating new session for user: ${userId}`);

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Create session
    const session = await SessionRepository.create({
      user_id: userId,
      transcript: transcript || '',
      emotion: emotion || null,
      status: 'active'
    });

    res.status(201).json({
      session,
      message: 'Session created successfully'
    });

  } catch (error) {
    console.error('Create session endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/sessions/session/:sessionId
 * Get a specific session by ID
 */
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

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

    console.log(`Fetching session: ${sessionId}`);

    const session = await SessionRepository.findById(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    res.json({ session });

  } catch (error) {
    console.error('Get session endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/sessions/:sessionId
 * Update a session
 */
router.put('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { transcript, summary, emotion, status, durationMinutes } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    console.log(`Updating session: ${sessionId}`);

    // Check if session exists
    const existingSession = await SessionRepository.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (transcript !== undefined) updateData.transcript = transcript;
    if (summary !== undefined) updateData.summary = summary;
    if (emotion !== undefined) updateData.emotion = emotion;
    if (status !== undefined) updateData.status = status;
    if (durationMinutes !== undefined) updateData.duration_minutes = durationMinutes;

    // Update session
    const updatedSession = await SessionRepository.update(sessionId, updateData);

    res.json({
      session: updatedSession,
      message: 'Session updated successfully'
    });

  } catch (error) {
    console.error('Update session endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/sessions/:sessionId/complete
 * Complete a session with summary and emotion
 */
router.post('/:sessionId/complete', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { summary, emotion, durationMinutes } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    if (!summary) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'summary is required to complete a session'
      });
    }

    console.log(`Completing session: ${sessionId}`);

    // Complete the session
    const completedSession = await SessionRepository.completeSession(
      sessionId,
      summary,
      emotion,
      durationMinutes
    );

    res.json({
      session: completedSession,
      message: 'Session completed successfully'
    });

  } catch (error) {
    console.error('Complete session endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Delete a session
 */
router.delete('/:sessionId', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    console.log(`Deleting session: ${sessionId}`);

    // Check if session exists
    const existingSession = await SessionRepository.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    // Delete session
    await SessionRepository.delete(sessionId);

    res.json({
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
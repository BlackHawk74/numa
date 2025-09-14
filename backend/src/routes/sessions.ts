import { Router, Request, Response } from 'express';
import { SessionRepository } from '../database/repositories/SessionRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import { authenticateUser, ensureUserExists } from '../middleware/auth';

const router = Router();

/**
 * GET /api/sessions
 * Get sessions for current authenticated user
 */
router.get('/', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log(`Fetching sessions for user: ${req.userId}, limit: ${limit}, offset: ${offset}`);

    // Get sessions
    const sessions = await SessionRepository.findByUserId(req.userId!, limit, offset);

    // Get session statistics
    const stats = await SessionRepository.getSessionStats(req.userId!);

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
 * POST /api/sessions/initialize
 * Initialize a new session with user context
 */
router.post('/initialize', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    console.log(`Initializing new session for user: ${req.userId}`);

    // Get user context (user, recent sessions, active goals)
    const userContext = await UserRepository.getUserWithContext(req.userId!);

    // Create new session
    const session = await SessionRepository.create({
      user_id: req.userId!,
      transcript: '',
      status: 'active'
    });

    res.status(201).json({
      session,
      userContext: {
        user: userContext.user,
        recentSessions: userContext.recentSessions,
        activeGoals: userContext.activeGoals
      },
      message: 'Session initialized successfully with user context'
    });

  } catch (error) {
    console.error('Initialize session endpoint error:', error);

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
router.post('/', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    const { transcript, emotion } = req.body;

    console.log(`Creating new session for user: ${req.userId}`);

    // Create session
    const session = await SessionRepository.create({
      user_id: req.userId!,
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
 * Get a specific session by ID (must belong to authenticated user)
 */
router.get('/session/:sessionId', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
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

    // Verify session belongs to authenticated user
    if (session.user_id !== req.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only access your own sessions'
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
 * Update a session (must belong to authenticated user)
 */
router.put('/:sessionId', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
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

    // Check if session exists and belongs to user
    const existingSession = await SessionRepository.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    // Verify session belongs to authenticated user
    if (existingSession.user_id !== req.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own sessions'
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
 * Complete a session with summary and emotion (must belong to authenticated user)
 */
router.post('/:sessionId/complete', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
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

    // Check if session exists and belongs to user
    const existingSession = await SessionRepository.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    // Verify session belongs to authenticated user
    if (existingSession.user_id !== req.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only complete your own sessions'
      });
    }

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
 * Delete a session (must belong to authenticated user)
 */
router.delete('/:sessionId', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({
        error: 'Missing session ID',
        message: 'Session ID is required'
      });
    }

    console.log(`Deleting session: ${sessionId}`);

    // Check if session exists and belongs to user
    const existingSession = await SessionRepository.findById(sessionId);
    if (!existingSession) {
      return res.status(404).json({
        error: 'Session not found',
        message: 'The specified session does not exist'
      });
    }

    // Verify session belongs to authenticated user
    if (existingSession.user_id !== req.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only delete your own sessions'
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
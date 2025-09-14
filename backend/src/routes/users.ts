import { Router, Request, Response } from 'express';
import { UserRepository } from '../database/repositories/UserRepository';
import { authenticateUser, ensureUserExists } from '../middleware/auth';

const router = Router();

/**
 * POST /api/users
 * Create a new user (authenticated)
 */
router.post('/', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { name, preferences } = req.body;

    console.log('Creating new user:', { userId: req.userId, name, preferences });

    // Create user with authenticated user ID
    const user = await UserRepository.create({
      id: req.userId!, // Use authenticated user ID
      name: name || req.user?.user_metadata?.name || 'Anonymous User',
      preferences: preferences || {}
    });

    res.status(201).json({
      user,
      message: 'User created successfully'
    });

  } catch (error) {
    console.error('Create user endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/users/me
 * Get current authenticated user
 */
router.get('/me', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    console.log(`Fetching user: ${req.userId}`);

    const user = await UserRepository.findById(req.userId!);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/users/me/context
 * Get current user with their context (recent sessions and active goals)
 */
router.get('/me/context', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    console.log(`Fetching user context: ${req.userId}`);

    const userContext = await UserRepository.getUserWithContext(req.userId!);

    res.json({
      user: userContext.user,
      recentSessions: userContext.recentSessions,
      activeGoals: userContext.activeGoals,
      context: {
        sessionCount: userContext.recentSessions.length,
        goalCount: userContext.activeGoals.length,
        lastSessionDate: userContext.recentSessions[0]?.date || null
      }
    });

  } catch (error) {
    console.error('Get user context endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/users/me
 * Update current authenticated user
 */
router.put('/me', authenticateUser, ensureUserExists, async (req: Request, res: Response) => {
  try {
    const { name, preferences } = req.body;

    console.log(`Updating user: ${req.userId}`);

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (preferences !== undefined) updateData.preferences = preferences;

    // Update user
    const updatedUser = await UserRepository.update(req.userId!, updateData);

    res.json({
      user: updatedUser,
      message: 'User updated successfully'
    });

  } catch (error) {
    console.error('Update user endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
import { Router, Request, Response } from 'express';
import { UserRepository } from '../database/repositories/UserRepository';

const router = Router();

/**
 * POST /api/users
 * Create a new user
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, preferences } = req.body;

    console.log('Creating new user:', { name, preferences });

    // Create user
    const user = await UserRepository.create({
      name: name || 'Anonymous User',
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
 * GET /api/users/:userId
 * Get a specific user by ID
 */
router.get('/:userId', async (req: Request, res: Response) => {
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

    console.log(`Fetching user: ${userId}`);

    const user = await UserRepository.findById(userId);
    
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
 * PUT /api/users/:userId
 * Update a user
 */
router.put('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { name, preferences } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing user ID',
        message: 'User ID is required'
      });
    }

    console.log(`Updating user: ${userId}`);

    // Check if user exists
    const existingUser = await UserRepository.findById(userId);
    if (!existingUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (preferences !== undefined) updateData.preferences = preferences;

    // Update user
    const updatedUser = await UserRepository.update(userId, updateData);

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
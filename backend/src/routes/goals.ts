import { Router, Request, Response } from 'express';
import { GoalRepository } from '../database/repositories/GoalRepository';
import { UserRepository } from '../database/repositories/UserRepository';

const router = Router();

/**
 * GET /api/goals/:userId
 * Get goals for a specific user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const status = req.query.status as 'active' | 'completed' | 'cancelled' | undefined;
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

    console.log(`Fetching goals for user: ${userId}, status: ${status}, limit: ${limit}, offset: ${offset}`);

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Get goals
    const goals = await GoalRepository.findByUserId(userId, status, limit, offset);
    
    // Get goal statistics
    const stats = await GoalRepository.getGoalStats(userId);

    res.json({
      goals,
      pagination: {
        limit,
        offset,
        count: goals.length
      },
      statistics: stats
    });

  } catch (error) {
    console.error('Get goals endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/goals
 * Create a new goal
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, description, targetDate } = req.body;

    if (!userId || !description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'userId and description are required'
      });
    }

    console.log(`Creating new goal for user: ${userId}`);

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    // Create goal
    const goalData: any = {
      user_id: userId,
      description: description,
      status: 'active'
    };

    if (targetDate) {
      goalData.target_date = targetDate;
    }

    const goal = await GoalRepository.create(goalData);

    res.status(201).json({
      goal,
      message: 'Goal created successfully'
    });

  } catch (error) {
    console.error('Create goal endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/goals/goal/:goalId
 * Get a specific goal by ID
 */
router.get('/goal/:goalId', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    if (!goalId) {
      return res.status(400).json({
        error: 'Missing goal ID',
        message: 'Goal ID is required'
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(goalId)) {
      return res.status(400).json({
        error: 'Invalid goal ID format',
        message: 'goalId must be a valid UUID'
      });
    }

    console.log(`Fetching goal: ${goalId}`);

    const goal = await GoalRepository.findById(goalId);
    
    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found',
        message: 'The specified goal does not exist'
      });
    }

    res.json({ goal });

  } catch (error) {
    console.error('Get goal endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * PUT /api/goals/:goalId
 * Update a goal
 */
router.put('/:goalId', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { description, status, targetDate, progressNote } = req.body;

    if (!goalId) {
      return res.status(400).json({
        error: 'Missing goal ID',
        message: 'Goal ID is required'
      });
    }

    console.log(`Updating goal: ${goalId}`);

    // Check if goal exists
    const existingGoal = await GoalRepository.findById(goalId);
    if (!existingGoal) {
      return res.status(404).json({
        error: 'Goal not found',
        message: 'The specified goal does not exist'
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) updateData.status = status;
    if (targetDate !== undefined) updateData.target_date = targetDate;

    // Update goal
    let updatedGoal = await GoalRepository.update(goalId, updateData);

    // Add progress note if provided
    if (progressNote) {
      updatedGoal = await GoalRepository.addProgressNote(goalId, progressNote);
    }

    res.json({
      goal: updatedGoal,
      message: 'Goal updated successfully'
    });

  } catch (error) {
    console.error('Update goal endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/goals/:goalId/complete
 * Complete a goal
 */
router.post('/:goalId/complete', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { progressNote } = req.body;

    if (!goalId) {
      return res.status(400).json({
        error: 'Missing goal ID',
        message: 'Goal ID is required'
      });
    }

    console.log(`Completing goal: ${goalId}`);

    // Complete the goal
    const completedGoal = await GoalRepository.completeGoal(goalId, progressNote);

    res.json({
      goal: completedGoal,
      message: 'Goal completed successfully'
    });

  } catch (error) {
    console.error('Complete goal endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * POST /api/goals/:goalId/progress
 * Add progress note to a goal
 */
router.post('/:goalId/progress', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { note } = req.body;

    if (!goalId || !note) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'goalId and note are required'
      });
    }

    console.log(`Adding progress note to goal: ${goalId}`);

    const updatedGoal = await GoalRepository.addProgressNote(goalId, note);

    res.json({
      goal: updatedGoal,
      message: 'Progress note added successfully'
    });

  } catch (error) {
    console.error('Add progress note endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * GET /api/goals/:userId/due-soon
 * Get goals due soon for a user
 */
router.get('/:userId/due-soon', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const days = parseInt(req.query.days as string) || 7;

    if (!userId) {
      return res.status(400).json({
        error: 'Missing user ID',
        message: 'User ID is required'
      });
    }

    console.log(`Fetching goals due soon for user: ${userId}, within ${days} days`);

    // Verify user exists
    const user = await UserRepository.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'The specified user does not exist'
      });
    }

    const goalsDueSoon = await GoalRepository.getGoalsDueSoon(userId, days);

    res.json({
      goals: goalsDueSoon,
      daysAhead: days,
      count: goalsDueSoon.length
    });

  } catch (error) {
    console.error('Get goals due soon endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

/**
 * DELETE /api/goals/:goalId
 * Delete a goal
 */
router.delete('/:goalId', async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;

    if (!goalId) {
      return res.status(400).json({
        error: 'Missing goal ID',
        message: 'Goal ID is required'
      });
    }

    console.log(`Deleting goal: ${goalId}`);

    // Check if goal exists
    const existingGoal = await GoalRepository.findById(goalId);
    if (!existingGoal) {
      return res.status(404).json({
        error: 'Goal not found',
        message: 'The specified goal does not exist'
      });
    }

    // Delete goal
    await GoalRepository.delete(goalId);

    res.json({
      message: 'Goal deleted successfully'
    });

  } catch (error) {
    console.error('Delete goal endpoint error:', error);
    
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
});

export default router;
import React, { useState, useEffect } from 'react';
import { Goal } from '../types';
import { GoalService, GoalListResponse } from '../services/GoalService';

interface GoalManagerProps {
  userId: string;
  className?: string;
  onGoalUpdate?: (goal: Goal) => void;
}

export function GoalManager({ userId, className = '', onGoalUpdate }: GoalManagerProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [statistics, setStatistics] = useState<GoalListResponse['statistics'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');

  // Form state
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadGoals();
  }, [userId, activeTab]);

  const loadGoals = async () => {
    try {
      setLoading(true);
      setError(null);

      const status = activeTab === 'all' ? undefined : activeTab;
      const response = await GoalService.getUserGoals(userId, status);

      setGoals(response.goals);
      setStatistics(response.statistics);

    } catch (err) {
      console.error('Error loading goals:', err);
      setError(err instanceof Error ? err.message : 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGoalDescription.trim()) return;

    try {
      setCreating(true);
      
      const goal = await GoalService.createGoal(
        userId,
        newGoalDescription.trim(),
        newGoalTargetDate || undefined
      );

      setGoals(prev => [goal, ...prev]);
      setNewGoalDescription('');
      setNewGoalTargetDate('');
      setShowCreateForm(false);

      if (onGoalUpdate) {
        onGoalUpdate(goal);
      }

      // Refresh statistics
      loadGoals();

    } catch (err) {
      console.error('Error creating goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to create goal');
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteGoal = async (goalId: string) => {
    try {
      const updatedGoal = await GoalService.completeGoal(goalId, 'Goal completed by user');
      
      setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));

      if (onGoalUpdate) {
        onGoalUpdate(updatedGoal);
      }

      // Refresh to update statistics
      loadGoals();

    } catch (err) {
      console.error('Error completing goal:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete goal');
    }
  };

  const handleAddProgress = async (goalId: string, note: string) => {
    try {
      const updatedGoal = await GoalService.addProgressNote(goalId, note);
      
      setGoals(prev => prev.map(g => g.id === goalId ? updatedGoal : g));

      if (onGoalUpdate) {
        onGoalUpdate(updatedGoal);
      }

    } catch (err) {
      console.error('Error adding progress note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add progress note');
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Goals & Progress</h3>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            {showCreateForm ? 'Cancel' : '+ New Goal'}
          </button>
        </div>

        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.activeGoals}</div>
              <div className="text-gray-500">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.completedGoals}</div>
              <div className="text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {GoalService.calculateCompletionRate(statistics)}%
              </div>
              <div className="text-gray-500">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.overdueTasks}</div>
              <div className="text-gray-500">Overdue</div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {(['active', 'completed', 'all'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Create Goal Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateGoal} className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goal Description
              </label>
              <textarea
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="Describe your therapy goal..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={3}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Date (Optional)
              </label>
              <input
                type="date"
                value={newGoalTargetDate}
                onChange={(e) => setNewGoalTargetDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating || !newGoalDescription.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Goal'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">🎯</div>
            <p className="text-gray-500">No goals yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'active' ? 'Create your first therapy goal' : `No ${activeTab} goals`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onComplete={() => handleCompleteGoal(goal.id)}
                onAddProgress={(note) => handleAddProgress(goal.id, note)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onComplete: () => void;
  onAddProgress: (note: string) => void;
}

function GoalCard({ goal, onComplete, onAddProgress }: GoalCardProps) {
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressNote, setProgressNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const priority = GoalService.getPriority(goal.target_date);
  const priorityColor = GoalService.getPriorityColor(priority);

  const handleAddProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!progressNote.trim()) return;

    try {
      setSubmitting(true);
      await onAddProgress(progressNote.trim());
      setProgressNote('');
      setShowProgressForm(false);
    } catch (error) {
      console.error('Error adding progress:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 text-xs rounded-full ${GoalService.getStatusColor(goal.status)}`}>
              {goal.status}
            </span>
            {goal.target_date && (
              <span className={`text-xs ${priorityColor}`}>
                {GoalService.formatTargetDate(goal.target_date)}
              </span>
            )}
          </div>
          
          <p className="text-gray-900 mb-2">{goal.description}</p>
          
          <div className="text-xs text-gray-500">
            Created {new Date(goal.created_at).toLocaleDateString()}
          </div>
        </div>

        {goal.status === 'active' && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => setShowProgressForm(!showProgressForm)}
              className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
            >
              Add Progress
            </button>
            <button
              onClick={onComplete}
              className="text-xs px-2 py-1 text-green-600 hover:bg-green-50 rounded transition-colors"
            >
              Complete
            </button>
          </div>
        )}
      </div>

      {/* Progress Notes */}
      {goal.progress_notes && goal.progress_notes.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-gray-700 mb-1">Progress Notes:</div>
          <div className="space-y-1">
            {goal.progress_notes.slice(-3).map((note, index) => (
              <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                {note}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Progress Form */}
      {showProgressForm && (
        <form onSubmit={handleAddProgress} className="mt-3 p-3 bg-gray-50 rounded">
          <textarea
            value={progressNote}
            onChange={(e) => setProgressNote(e.target.value)}
            placeholder="Add a progress note..."
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            rows={2}
            required
          />
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={submitting || !progressNote.trim()}
              className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Note'}
            </button>
            <button
              type="button"
              onClick={() => setShowProgressForm(false)}
              className="text-xs px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
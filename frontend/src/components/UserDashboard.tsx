import React, { useState, useEffect } from 'react';
import { User, Session, Goal } from '../types';
import { UserService, UserContextResponse } from '../services/UserService';
import { SessionHistory } from './SessionHistory';
import { GoalManager } from './GoalManager';

interface UserDashboardProps {
  user: User;
  onStartSession?: () => void;
  className?: string;
}

export function UserDashboard({ user, onStartSession, className = '' }: UserDashboardProps) {
  const [userContext, setUserContext] = useState<UserContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'goals'>('overview');

  useEffect(() => {
    loadUserContext();
  }, [user.id]);

  const loadUserContext = async () => {
    try {
      setLoading(true);
      setError(null);

      const context = await UserService.getUserContext(user.id);
      setUserContext(context);

    } catch (err) {
      console.error('Error loading user context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleGoalUpdate = (goal: Goal) => {
    // Refresh context when goals are updated
    loadUserContext();
  };

  const handleSessionSelect = (session: Session) => {
    // Could navigate to session details or show session info
    console.log('Selected session:', session);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadUserContext}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const therapyStreak = userContext ? UserService.calculateTherapyStreak(userContext.recentSessions) : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-sm text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {UserService.getDisplayName(user)}! 👋
            </h1>
            <p className="text-blue-100">
              {userContext?.context.lastSessionDate 
                ? `Last session: ${new Date(userContext.context.lastSessionDate).toLocaleDateString()}`
                : 'Ready to start your therapy journey?'
              }
            </p>
          </div>
          
          {onStartSession && (
            <button
              onClick={onStartSession}
              className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Start New Session
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {userContext && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 mb-1">
              {userContext.context.sessionCount}
            </div>
            <div className="text-sm text-gray-500">Recent Sessions</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-2xl font-bold text-green-600 mb-1">
              {userContext.context.goalCount}
            </div>
            <div className="text-sm text-gray-500">Active Goals</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-2xl font-bold text-purple-600 mb-1">
              {therapyStreak}
            </div>
            <div className="text-sm text-gray-500">Day Streak</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
            <div className="text-2xl font-bold text-orange-600 mb-1">
              {UserService.formatJoinDate(user).split(' ')[1]}
            </div>
            <div className="text-sm text-gray-500">Member Since</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {(['overview', 'sessions', 'goals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && userContext && (
            <OverviewTab 
              userContext={userContext} 
              onStartSession={onStartSession}
              onSessionSelect={handleSessionSelect}
            />
          )}
          
          {activeTab === 'sessions' && (
            <SessionHistory 
              userId={user.id}
              onSessionSelect={handleSessionSelect}
            />
          )}
          
          {activeTab === 'goals' && (
            <GoalManager 
              userId={user.id}
              onGoalUpdate={handleGoalUpdate}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface OverviewTabProps {
  userContext: UserContextResponse;
  onStartSession?: () => void;
  onSessionSelect?: (session: Session) => void;
}

function OverviewTab({ userContext, onStartSession, onSessionSelect }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Recent Activity */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        
        {userContext.recentSessions.length === 0 && userContext.activeGoals.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <div className="text-gray-400 mb-2">🌟</div>
            <p className="text-gray-600 mb-2">Ready to begin your therapy journey?</p>
            <p className="text-sm text-gray-500 mb-4">
              Start your first session or set a goal to get started
            </p>
            {onStartSession && (
              <button
                onClick={onStartSession}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Start First Session
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Recent Sessions</h4>
              {userContext.recentSessions.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">No recent sessions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userContext.recentSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSessionSelect?.(session)}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {new Date(session.date).toLocaleDateString()}
                          </div>
                          {session.emotion && (
                            <div className="text-xs text-gray-500">
                              Mood: {session.emotion}
                            </div>
                          )}
                        </div>
                        <div className={`px-2 py-1 text-xs rounded-full ${
                          session.status === 'completed' ? 'bg-green-100 text-green-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {session.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Goals */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Active Goals</h4>
              {userContext.activeGoals.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">No active goals</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userContext.activeGoals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="p-3 border rounded-lg">
                      <div className="text-sm text-gray-900 mb-1 line-clamp-2">
                        {goal.description}
                      </div>
                      {goal.target_date && (
                        <div className="text-xs text-gray-500">
                          Target: {new Date(goal.target_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {onStartSession && (
            <button
              onClick={onStartSession}
              className="p-4 border-2 border-dashed border-blue-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <div className="text-blue-500 mb-2">🎙️</div>
              <div className="font-medium text-blue-700">Start Session</div>
              <div className="text-sm text-blue-600">Begin a new therapy session</div>
            </button>
          )}
          
          <div className="p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition-colors text-center cursor-pointer">
            <div className="text-green-500 mb-2">🎯</div>
            <div className="font-medium text-green-700">Set Goal</div>
            <div className="text-sm text-green-600">Create a new therapy goal</div>
          </div>
          
          <div className="p-4 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors text-center cursor-pointer">
            <div className="text-purple-500 mb-2">📊</div>
            <div className="font-medium text-purple-700">View Progress</div>
            <div className="text-sm text-purple-600">Check your therapy progress</div>
          </div>
        </div>
      </div>
    </div>
  );
}
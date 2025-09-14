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

      const context = await UserService.getUserContext();
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
      <div className={`space-y-8 ${className}`}>
        <div className="bg-white border border-gray-200 p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-100 w-1/3 mb-6"></div>
            <div className="h-4 bg-gray-100 w-2/3 mb-3"></div>
            <div className="h-4 bg-gray-100 w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 p-8 ${className}`}>
        <div className="text-center">
          <div className="text-charcoal mb-4 text-2xl">⚠</div>
          <p className="text-gray-600 mb-6 font-light">{error}</p>
          <button
            onClick={loadUserContext}
            className="px-6 py-3 bg-charcoal text-white hover:bg-charcoal-light transition-colors duration-200 font-medium uppercase tracking-wide text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const therapyStreak = userContext ? UserService.calculateTherapyStreak(userContext.recentSessions) : 0;

  return (
    <div className={`space-y-12 ${className}`}>
      {/* Welcome Header */}
      <div className="bg-white border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light text-charcoal mb-3">
              {UserService.getDisplayName(user)}
            </h1>
            <p className="text-gray-500 text-sm font-light">
              {userContext?.context.lastSessionDate 
                ? `Last session: ${new Date(userContext.context.lastSessionDate).toLocaleDateString()}`
                : 'Ready to begin'
              }
            </p>
          </div>
          
          {onStartSession && (
            <button
              onClick={onStartSession}
              className="px-6 py-3 bg-charcoal text-white hover:bg-charcoal-light transition-colors duration-200 text-sm font-medium uppercase tracking-wide"
            >
              New Session
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {userContext && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white border border-gray-200 p-6 text-center">
            <div className="text-3xl font-light text-charcoal mb-2">
              {userContext.context.sessionCount}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Sessions</div>
          </div>
          
          <div className="bg-white border border-gray-200 p-6 text-center">
            <div className="text-3xl font-light text-charcoal mb-2">
              {userContext.context.goalCount}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Goals</div>
          </div>
          
          <div className="bg-white border border-gray-200 p-6 text-center">
            <div className="text-3xl font-light text-charcoal mb-2">
              {therapyStreak}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Streak</div>
          </div>
          
          <div className="bg-white border border-gray-200 p-6 text-center">
            <div className="text-3xl font-light text-charcoal mb-2">
              {UserService.formatJoinDate(user).split(' ')[1]}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide font-medium">Since</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200">
        <div className="border-b border-gray-100">
          <nav className="flex space-x-12 px-8">
            {(['overview', 'sessions', 'goals'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-semibold text-xs uppercase tracking-wide transition-colors duration-200 ${
                  activeTab === tab
                    ? 'border-charcoal text-charcoal'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-8">
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
        <h3 className="text-sm font-medium text-black mb-4 uppercase tracking-wide">Activity</h3>
        
        {userContext.recentSessions.length === 0 && userContext.activeGoals.length === 0 ? (
          <div className="text-center py-8 border border-gray-200">
            <p className="text-gray-600 mb-2 text-sm">Ready to begin</p>
            <p className="text-xs text-gray-500 mb-4">
              Start your first session or set a goal
            </p>
            {onStartSession && (
              <button
                onClick={onStartSession}
                className="px-3 py-1 bg-black text-white hover:bg-gray-800 transition-colors text-xs"
              >
                Start Session
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Sessions */}
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Sessions</h4>
              {userContext.recentSessions.length === 0 ? (
                <div className="text-center py-4 border border-gray-200">
                  <p className="text-sm text-gray-500">No sessions</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userContext.recentSessions.slice(0, 3).map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSessionSelect?.(session)}
                      className="p-3 border border-gray-200 hover:border-black cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-black">
                            {new Date(session.date).toLocaleDateString()}
                          </div>
                          {session.emotion && (
                            <div className="text-xs text-gray-500">
                              {session.emotion}
                            </div>
                          )}
                        </div>
                        <div className={`px-1 py-0 text-xs border ${
                          session.status === 'completed' ? 'border-gray-300 text-gray-600' :
                          'border-black text-black'
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
              <h4 className="text-xs font-medium text-gray-700 mb-3 uppercase tracking-wide">Goals</h4>
              {userContext.activeGoals.length === 0 ? (
                <div className="text-center py-4 border border-gray-200">
                  <p className="text-sm text-gray-500">No goals</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {userContext.activeGoals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="p-3 border border-gray-200">
                      <div className="text-sm text-black mb-1 line-clamp-2">
                        {goal.description}
                      </div>
                      {goal.target_date && (
                        <div className="text-xs text-gray-500">
                          {new Date(goal.target_date).toLocaleDateString()}
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
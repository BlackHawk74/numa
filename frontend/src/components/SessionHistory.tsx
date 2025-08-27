import React, { useState, useEffect } from 'react';
import { Session } from '../types';
import { SessionService, SessionListResponse } from '../services/SessionService';

interface SessionHistoryProps {
  userId: string;
  onSessionSelect?: (session: Session) => void;
  className?: string;
}

export function SessionHistory({ userId, onSessionSelect, className = '' }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [statistics, setStatistics] = useState<SessionListResponse['statistics'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const SESSIONS_PER_PAGE = 5;

  useEffect(() => {
    loadSessions(true);
  }, [userId]);

  const loadSessions = async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentPage = reset ? 0 : page;
      const offset = currentPage * SESSIONS_PER_PAGE;

      const response = await SessionService.getUserSessions(userId, SESSIONS_PER_PAGE, offset);

      if (reset) {
        setSessions(response.sessions);
        setPage(0);
      } else {
        setSessions(prev => [...prev, ...response.sessions]);
      }

      setStatistics(response.statistics);
      setHasMore(response.sessions.length === SESSIONS_PER_PAGE);

    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
      loadSessions(false);
    }
  };

  const handleSessionClick = (session: Session) => {
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
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
            onClick={() => loadSessions(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Session History</h3>
        
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.totalSessions}</div>
              <div className="text-gray-500">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.completedSessions}</div>
              <div className="text-gray-500">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {statistics.averageDuration ? `${Math.round(statistics.averageDuration)}m` : 'N/A'}
              </div>
              <div className="text-gray-500">Avg Duration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {statistics.mostCommonEmotion || 'N/A'}
              </div>
              <div className="text-gray-500">Common Mood</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">📝</div>
            <p className="text-gray-500">No sessions yet</p>
            <p className="text-sm text-gray-400 mt-1">Start your first therapy session to see it here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className={`p-4 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                  session.status === 'completed' ? 'border-green-200 bg-green-50' : 
                  session.status === 'active' ? 'border-blue-200 bg-blue-50' : 
                  'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {SessionService.formatSessionDate(session.date)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        session.status === 'completed' ? 'bg-green-100 text-green-700' :
                        session.status === 'active' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {session.status}
                      </span>
                      {session.emotion && (
                        <span className={`text-xs ${SessionService.getEmotionColor(session.emotion)}`}>
                          {session.emotion}
                        </span>
                      )}
                    </div>
                    
                    {session.summary && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-1">
                        {session.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {session.duration_minutes && (
                        <span>Duration: {SessionService.formatDuration(session.duration_minutes)}</span>
                      )}
                      <span>
                        {new Date(session.date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-gray-400">
                    →
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Load More Sessions'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
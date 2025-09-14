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

      const response = await SessionService.getUserSessions(SESSIONS_PER_PAGE, offset);

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
      <div className={`bg-white border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-gray-100"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border border-gray-200 p-6 ${className}`}>
        <div className="text-center">
          <p className="text-gray-600 mb-4 text-sm">{error}</p>
          <button
            onClick={() => loadSessions(true)}
            className="px-3 py-1 bg-black text-white hover:bg-gray-800 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-black mb-3 uppercase tracking-wide">Sessions</h3>
        
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="text-center">
              <div className="text-lg font-light text-black">{statistics.totalSessions}</div>
              <div className="text-gray-500 uppercase tracking-wide">Total</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-light text-black">{statistics.completedSessions}</div>
              <div className="text-gray-500 uppercase tracking-wide">Complete</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-light text-black">
                {statistics.averageDuration ? `${Math.round(statistics.averageDuration)}m` : '—'}
              </div>
              <div className="text-gray-500 uppercase tracking-wide">Avg Time</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-light text-black">
                {statistics.mostCommonEmotion || '—'}
              </div>
              <div className="text-gray-500 uppercase tracking-wide">Mood</div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No sessions</p>
            <p className="text-xs text-gray-400 mt-1">Start your first session</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => handleSessionClick(session)}
                className={`p-3 border border-gray-200 transition-colors cursor-pointer hover:border-black ${
                  session.status === 'completed' ? 'bg-gray-50' : 
                  session.status === 'active' ? 'bg-white' : 
                  'bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm text-black">
                        {SessionService.formatSessionDate(session.date)}
                      </span>
                      <span className={`px-1 py-0 text-xs border ${
                        session.status === 'completed' ? 'border-gray-300 text-gray-600' :
                        session.status === 'active' ? 'border-black text-black' :
                        'border-gray-300 text-gray-600'
                      }`}>
                        {session.status}
                      </span>
                      {session.emotion && (
                        <span className="text-xs text-gray-500">
                          {session.emotion}
                        </span>
                      )}
                    </div>
                    
                    {session.summary && (
                      <p className="text-xs text-gray-600 line-clamp-2 mb-1">
                        {session.summary}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {session.duration_minutes && (
                        <span>{SessionService.formatDuration(session.duration_minutes)}</span>
                      )}
                      <span>
                        {new Date(session.date).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-gray-300 text-xs">
                    →
                  </div>
                </div>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loading}
                className="w-full py-2 text-xs text-gray-600 hover:text-black border border-gray-200 hover:border-black transition-colors disabled:opacity-50 uppercase tracking-wide"
              >
                {loading ? 'Loading...' : 'More'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
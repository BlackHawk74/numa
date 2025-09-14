import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserSession } from '../hooks/useUserSession';

export const DebugInfo: React.FC = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const { user, loading, initializing, error, currentSession } = useUserSession();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div>Auth User: {authUser ? authUser.email : 'None'}</div>
      <div>Auth Loading: {authLoading ? 'Yes' : 'No'}</div>
      <div>DB User: {user ? user.name || user.id : 'None'}</div>
      <div>User Loading: {loading ? 'Yes' : 'No'}</div>
      <div>Initializing: {initializing ? 'Yes' : 'No'}</div>
      <div>Current Session: {currentSession ? 'Yes' : 'No'}</div>
      <div>Error: {error || 'None'}</div>
      <div>Current URL: {window.location.pathname}</div>
    </div>
  );
};
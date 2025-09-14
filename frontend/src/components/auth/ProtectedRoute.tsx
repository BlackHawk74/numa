import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { AuthForm } from './AuthForm';
import { LoadingSpinner } from '../LoadingStates';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Numa AI Therapist
            </h1>
            <p className="text-gray-600">
              Your compassionate AI therapy companion
            </p>
          </div>
          
          <AuthForm 
            mode={authMode}
            onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
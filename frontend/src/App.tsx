import React, { useEffect, useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider, useAppContext } from './context/AppContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { UserProfile } from './components/auth/UserProfile';
import VoiceInterface from './components/VoiceInterface';
import ConversationDisplay from './components/ConversationDisplay';
import AudioProcessor from './components/AudioProcessor';
import { UserDashboard } from './components/UserDashboard';
import { ErrorNotification, ErrorBoundary, NetworkError } from './components/ErrorNotification';
import { LoadingOverlay, LoadingSpinner } from './components/LoadingStates';
import { DebugInfo } from './components/DebugInfo';

import { useUserSession } from './hooks/useUserSession';
import { useErrorHandling } from './hooks/useErrorHandling';
import { FeatureDetector } from './utils/errorHandling';

type AppView = 'onboarding' | 'dashboard' | 'session';

// Main app content component
function AppContent() {
  const { state } = useAppContext();
  const {
    user,
    currentSession,
    loading: userLoading,
    initializing,
    error: userError,
    initializeUser,
    startNewSession
  } = useUserSession();
  const {
    globalError,
    isOnline,
    clearError,
    handleError,
    retryOperation
  } = useErrorHandling();

  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [userName, setUserName] = useState('');
  const [browserSupport, setBrowserSupport] = useState<{
    supported: boolean;
    issues: string[];
    recommendations: string[];
  } | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const support = FeatureDetector.checkBrowserSupport();
    setBrowserSupport(support);

    if (!support.supported) {
      handleError(new Error('Browser compatibility issues detected'), {
        issues: support.issues,
        recommendations: support.recommendations,
      });
    }
  }, [handleError]);

  // Determine current view based on user and session state
  useEffect(() => {
    console.log('App: Determining view - initializing:', initializing, 'user:', !!user, 'user.id:', user?.id, 'currentSession:', !!currentSession, 'currentView:', currentView);

    if (initializing) {
      console.log('App: Still initializing, not changing view');
      return;
    }

    if (!user) {
      console.log('App: Setting view to onboarding (no user)');
      setCurrentView('onboarding');
    } else if (currentSession) {
      console.log('App: Setting view to session');
      setCurrentView('session');
    } else {
      console.log('App: Setting view to dashboard');
      setCurrentView('dashboard');
    }
  }, [user, currentSession, initializing, currentView]);

  const handleUserRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await retryOperation(
        () => initializeUser(userName.trim() || 'Demo User'),
        'initialize user'
      );
    } catch (error) {
      handleError(error, { operation: 'userRegistration' });
    }
  };

  const handleStartSession = async () => {
    try {
      await retryOperation(
        () => startNewSession(),
        'start new session'
      );
      setCurrentView('session');
    } catch (error) {
      handleError(error, { operation: 'startSession' });
    }
  };

  const handleEndSession = () => {
    setCurrentView('dashboard');
  };

  const handleAudioError = (error: string) => {
    handleError(new Error(error), { operation: 'audio' });
  };

  const handleRetryLastOperation = () => {
    // This would retry the last failed operation
    // Implementation depends on what operation failed
    window.location.reload();
  };

  console.log('App: Rendering - currentView:', currentView, 'initializing:', initializing, 'user:', !!user);

  if (initializing) {
    console.log('App: Rendering initializing view');
    return (
      <>
        <LoadingOverlay
          isVisible={true}
          message="Initializing Numa..."
        />
        <ErrorNotification
          error={globalError}
          onDismiss={clearError}
          onRetry={handleRetryLastOperation}
        />
        <DebugInfo />
      </>
    );
  }

  // If we don't have a user yet but we're not initializing, show loading
  if (!user && !initializing) {
    console.log('App: Rendering user setup view');
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-500">Setting up your account...</p>
        </div>
        <DebugInfo />
      </div>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard' && user) {
    console.log('App: Rendering dashboard view');
    return (
      <>
        <div className="min-h-screen bg-white">
          {/* Header with user profile */}
          <header className="bg-white border-b border-gray-100">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-light text-charcoal">Numa</h1>
                <UserProfile />
              </div>
            </div>
          </header>

          <div className="container mx-auto px-4 py-8">
            <NetworkError
              isOnline={isOnline}
              onRetry={handleRetryLastOperation}
              className="mb-6"
            />
            <UserDashboard
              user={user}
              onStartSession={handleStartSession}
            />
          </div>

          {/* Debug Info */}
          <DebugInfo />
        </div>

        <ErrorNotification
          error={globalError}
          onDismiss={clearError}
          onRetry={handleRetryLastOperation}
        />
      </>
    );
  }

  // Session View
  if (currentView === 'session' && user && currentSession) {
    console.log('App: Rendering session view');
    return (
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-2xl font-light text-charcoal mb-2">
                  Session
                </h1>
                <p className="text-gray-500 text-sm font-light">
                  {new Date(currentSession.date).toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleEndSession}
                  className="px-4 py-2 text-gray-600 hover:text-charcoal border border-gray-200 hover:border-charcoal transition-colors duration-200 text-sm font-medium uppercase tracking-wide"
                >
                  End
                </button>
                <UserProfile />
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Conversation Display */}
            <div className="order-2 lg:order-1">
              <div className="bg-white p-8">
                <h2 className="text-sm font-semibold text-charcoal mb-8 uppercase tracking-wide">
                  Conversation
                </h2>
                <ConversationDisplay className="min-h-[500px]" />
              </div>
            </div>

            {/* Voice Interface */}
            <div className="order-1 lg:order-2">
              <div className="bg-white p-8">
                <div className="text-center mb-12">
                  <h2 className="text-sm font-semibold text-charcoal mb-3 uppercase tracking-wide">
                    Voice
                  </h2>
                  <p className="text-gray-500 text-sm font-light">
                    Click to speak
                  </p>
                </div>

                <VoiceInterface className="flex flex-col items-center" />
              </div>
            </div>
          </div>

          {/* Session Info */}
          {state.currentSession && (
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-3 border border-gray-200 px-4 py-2 text-xs text-gray-500 font-medium uppercase tracking-wide">
                <div className="w-2 h-2 bg-charcoal rounded-full" />
                <span>Active Session</span>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-gray-400 text-xs border-t border-gray-100 font-light">
          <p>
            Supportive tool, not a replacement for professional therapy
          </p>
        </footer>

        {/* Audio Processor */}
        <AudioProcessor onError={handleAudioError} />

        {/* Error Notification */}
        <ErrorNotification
          error={globalError}
          onDismiss={clearError}
          onRetry={handleRetryLastOperation}
        />

        {/* Debug Info */}
        <DebugInfo />
      </div>
    );
  }

  // Fallback
  console.log('App: Rendering fallback view - currentView:', currentView, 'user:', !!user, 'currentSession:', !!currentSession);
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Loading...</p>
        <p className="text-xs text-gray-400 mt-2">
          View: {currentView} | User: {user ? 'Yes' : 'No'} | Session: {currentSession ? 'Yes' : 'No'}
        </p>
        <DebugInfo />
      </div>
    </div>
  );
}

// Main App component with providers and error boundary
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProtectedRoute>
          <AppProvider>
            <AppContent />
          </AppProvider>
        </ProtectedRoute>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;

import React, { useEffect, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import VoiceInterface from './components/VoiceInterface';
import ConversationDisplay from './components/ConversationDisplay';
import AudioProcessor from './components/AudioProcessor';
import { UserDashboard } from './components/UserDashboard';
import { ErrorNotification, ErrorBoundary, NetworkError } from './components/ErrorNotification';
import { LoadingOverlay } from './components/LoadingStates';

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
    if (initializing) return;

    if (!user) {
      setCurrentView('onboarding');
    } else if (currentSession) {
      setCurrentView('session');
    } else {
      setCurrentView('dashboard');
    }
  }, [user, currentSession, initializing]);

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

  if (initializing) {
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
      </>
    );
  }

  // Onboarding View
  if (currentView === 'onboarding') {
    return (
      <>
        <div className="min-h-screen bg-white flex items-center justify-center px-4">
          <div className="bg-white border border-gray-200 p-12 max-w-md w-full">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-light text-charcoal mb-3">Numa</h1>
              <p className="text-gray-500 text-sm font-light uppercase tracking-wide">AI Therapy Companion</p>
            </div>

            {/* Network Error */}
            <NetworkError 
              isOnline={isOnline} 
              onRetry={handleRetryLastOperation}
              className="mb-6"
            />

            {/* Browser Support Warning */}
            {browserSupport && !browserSupport.supported && (
              <div className="mb-6 p-4 border border-gray-300 bg-gray-50 text-charcoal text-sm">
                <div className="font-medium mb-2">Browser Compatibility Issues</div>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {browserSupport.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
                {browserSupport.recommendations.length > 0 && (
                  <div className="mt-3">
                    <div className="font-medium text-charcoal">Recommendations:</div>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {browserSupport.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {userError && (
              <div className="mb-6 p-4 border border-gray-200 bg-gray-50 text-charcoal text-sm font-light">
                {userError}
              </div>
            )}

            <form onSubmit={handleUserRegistration} className="space-y-8">
              <div>
                <label className="block text-sm text-gray-600 mb-3 font-medium uppercase tracking-wide">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-200 focus:border-charcoal focus:outline-none transition-colors duration-200 bg-white text-charcoal font-light"
                  disabled={!isOnline}
                />
              </div>

              <button
                type="submit"
                disabled={userLoading || !isOnline}
                className="w-full py-4 bg-charcoal text-white hover:bg-charcoal-light transition-colors duration-200 disabled:opacity-50 font-medium uppercase tracking-wide text-sm"
              >
                {userLoading ? 'Starting...' : 'Begin'}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-gray-400 font-light">
              <p>Secure and confidential</p>
            </div>
          </div>
        </div>
        
        <ErrorNotification 
          error={globalError} 
          onDismiss={clearError}
          onRetry={handleRetryLastOperation}
        />
      </>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard' && user) {
    return (
      <>
        <div className="min-h-screen bg-white">
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
              <button
                onClick={handleEndSession}
                className="px-4 py-2 text-gray-600 hover:text-charcoal border border-gray-200 hover:border-charcoal transition-colors duration-200 text-sm font-medium uppercase tracking-wide"
              >
                End
              </button>
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
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Main App component with provider and error boundary
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;

import React, { useEffect, useRef, useState } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import VoiceInterface from './components/VoiceInterface';
import ConversationDisplay from './components/ConversationDisplay';
import AudioProcessor from './components/AudioProcessor';
import { UserDashboard } from './components/UserDashboard';

import { ApiClient } from './utils/apiClient';
import { useUserSession } from './hooks/useUserSession';
import { User } from './types';

type AppView = 'onboarding' | 'dashboard' | 'session';

// Main app content component
function AppContent() {
  const { state, dispatch } = useAppContext();
  const {
    user,
    isNewUser,
    userContext,
    currentSession,
    loading: userLoading,
    initializing,
    error: userError,
    initializeUser,
    startNewSession
  } = useUserSession();

  const [currentView, setCurrentView] = useState<AppView>('onboarding');
  const [userName, setUserName] = useState('');

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
      await initializeUser(userName.trim() || 'Demo User');
    } catch (error) {
      console.error('Failed to initialize user:', error);
    }
  };

  const handleStartSession = async () => {
    try {
      await startNewSession();
      setCurrentView('session');
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const handleEndSession = () => {
    setCurrentView('dashboard');
  };

  const handleAudioError = (error: string) => {
    console.error('Audio error:', error);
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-therapy-blue to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Numa...</p>
        </div>
      </div>
    );
  }

  // Onboarding View
  if (currentView === 'onboarding') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-therapy-blue to-white flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8 max-w-md w-full mx-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Welcome to Numa</h1>
            <p className="text-gray-600">Your AI Therapy Companion</p>
          </div>

          {userError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {userError}
            </div>
          )}

          <form onSubmit={handleUserRegistration} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What should I call you? (Optional)
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={userLoading}
              className="w-full py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
            >
              {userLoading ? 'Getting Started...' : 'Get Started'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Your privacy is important to us. All conversations are secure and confidential.</p>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard View
  if (currentView === 'dashboard' && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-therapy-blue to-white">
        <div className="container mx-auto px-4 py-8">
          <UserDashboard
            user={user}
            onStartSession={handleStartSession}
          />
        </div>
      </div>
    );
  }

  // Session View
  if (currentView === 'session' && user && currentSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-therapy-blue to-white">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="text-center flex-1">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  Therapy Session with Numa
                </h1>
                <p className="text-gray-600">
                  Started {new Date(currentSession.date).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={handleEndSession}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                End Session
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Conversation Display */}
            <div className="order-2 lg:order-1">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                  Conversation
                </h2>
                <ConversationDisplay className="min-h-[400px]" />
              </div>
            </div>

            {/* Voice Interface */}
            <div className="order-1 lg:order-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-8">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-800 mb-2">
                    Voice Interface
                  </h2>
                  <p className="text-gray-600 text-sm">
                    Hold the button and speak to start your therapy session
                  </p>
                </div>
                
                <VoiceInterface className="flex flex-col items-center" />
              </div>
            </div>
          </div>

          {/* Session Info */}
          {state.currentSession && (
            <div className="mt-8 text-center">
              <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Session Active</span>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 py-8 text-center text-gray-500 text-sm">
          <p>
            Numa AI Therapist - Providing compassionate support through technology
          </p>
          <p className="mt-2">
            Remember: This is a supportive tool, not a replacement for professional therapy
          </p>
        </footer>

        {/* Audio Processor */}
        <AudioProcessor onError={handleAudioError} />
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-gradient-to-br from-therapy-blue to-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main App component with provider
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

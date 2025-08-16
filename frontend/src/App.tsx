import React, { useEffect, useRef } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import VoiceInterface from './components/VoiceInterface';
import ConversationDisplay from './components/ConversationDisplay';
import AudioProcessor from './components/AudioProcessor';

import { ApiClient } from './utils/apiClient';
import { User } from './types';

// Main app content component
function AppContent() {
  const { state, dispatch } = useAppContext();
  const initializationRef = useRef({ 
    userInitialized: false, 
    sessionInitialized: false,
    isInitializing: false 
  });

  // Initialize user on app start - only once
  useEffect(() => {
    if (initializationRef.current.userInitialized || initializationRef.current.isInitializing) {
      return;
    }
    
    const initializeUser = async () => {
      try {
        initializationRef.current.isInitializing = true;
        
        // Check if user exists in localStorage
        const storedUserId = localStorage.getItem('numa-user-id');
        let user: User;

        if (storedUserId) {
          try {
            // Try to get existing user
            user = await ApiClient.getUser(storedUserId);
          } catch (error) {
            console.log('Stored user not found, creating new user');
            // If user doesn't exist, create a new one
            user = await ApiClient.createUser('Demo User', {});
            localStorage.setItem('numa-user-id', user.id);
          }
        } else {
          // Create a new user
          user = await ApiClient.createUser('Demo User', {});
          localStorage.setItem('numa-user-id', user.id);
        }

        dispatch({ type: 'SET_USER', payload: user });
        initializationRef.current.userInitialized = true;
        
        // Start session immediately after user creation
        setTimeout(async () => {
          if (!initializationRef.current.sessionInitialized) {
            initializationRef.current.sessionInitialized = true;
            try {
              const session = await ApiClient.createSession(user.id);
              dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
            } catch (error) {
              console.error('Failed to create session:', error);
            }
          }
        }, 100);
        
      } catch (error) {
        console.error('Failed to initialize user:', error);
        // Fallback to local user if API fails
        const fallbackUser = {
          id: 'local-user-' + Date.now(),
          name: 'Local User',
          preferences: {},
        };
        dispatch({ type: 'SET_USER', payload: fallbackUser });
        initializationRef.current.userInitialized = true;
      } finally {
        initializationRef.current.isInitializing = false;
      }
    };

    initializeUser();
  }, [dispatch]); // Include dispatch dependency

  const handleAudioError = (error: string) => {
    console.error('Audio error:', error);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-therapy-blue to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Numa AI Therapist
            </h1>
            <p className="text-gray-600">
              Your compassionate AI therapy companion
            </p>
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

// Main App component with provider
function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;

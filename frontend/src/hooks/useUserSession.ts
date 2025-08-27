import { useState, useEffect, useCallback } from 'react';
import { User, Session, Goal } from '../types';
import { UserService, UserContextResponse } from '../services/UserService';
import { SessionService, SessionWithContext } from '../services/SessionService';
import { useAppContext } from '../context/AppContext';

export interface UseUserSessionReturn {
  // User state
  user: User | null;
  isNewUser: boolean;
  userContext: UserContextResponse | null;
  
  // Session state
  currentSession: Session | null;
  
  // Loading states
  loading: boolean;
  initializing: boolean;
  
  // Error state
  error: string | null;
  
  // Actions
  initializeUser: (name?: string) => Promise<void>;
  startNewSession: () => Promise<Session>;
  loadUserContext: () => Promise<void>;
  updateUser: (updates: { name?: string; preferences?: Record<string, any> }) => Promise<void>;
  clearUser: () => void;
}

/**
 * Hook for managing user sessions and context
 */
export function useUserSession(): UseUserSessionReturn {
  const { state, dispatch } = useAppContext();
  
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userContext, setUserContext] = useState<UserContextResponse | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user on mount
  useEffect(() => {
    const initializeFromStorage = async () => {
      try {
        setInitializing(true);
        setError(null);

        const existingUserId = UserService.getCurrentUserId();
        if (existingUserId) {
          // Try to load existing user
          try {
            const context = await UserService.getUserContext(existingUserId);
            setUser(context.user);
            setUserContext(context);
            setIsNewUser(false);
            
            // Update app context
            dispatch({ type: 'SET_USER', payload: context.user });
          } catch (err) {
            console.warn('Failed to load existing user, will need to re-initialize:', err);
            UserService.clearCurrentUser();
          }
        }
      } catch (err) {
        console.error('Error during initialization:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize user session');
      } finally {
        setInitializing(false);
      }
    };

    initializeFromStorage();
  }, [dispatch]);

  // Sync current session with app context
  useEffect(() => {
    if (currentSession) {
      dispatch({ type: 'SET_CURRENT_SESSION', payload: currentSession });
    }
  }, [currentSession, dispatch]);

  const initializeUser = useCallback(async (name?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await UserService.initializeUser(name);
      
      setUser(result.user);
      setIsNewUser(result.isNewUser);
      
      if (result.context) {
        setUserContext(result.context);
      }

      // Update app context
      dispatch({ type: 'SET_USER', payload: result.user });

      // Load full context if it's a new user
      if (result.isNewUser) {
        await loadUserContext();
      }

    } catch (err) {
      console.error('Error initializing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  const startNewSession = useCallback(async (): Promise<Session> => {
    if (!user) {
      throw new Error('No user available to start session');
    }

    try {
      setLoading(true);
      setError(null);

      const sessionWithContext = await SessionService.initializeSession(user.id);
      
      setCurrentSession(sessionWithContext.session);
      
      // Update user context with the new session data
      const contextWithStats: UserContextResponse = {
        ...sessionWithContext.userContext,
        context: {
          sessionCount: sessionWithContext.userContext.recentSessions.length,
          goalCount: sessionWithContext.userContext.activeGoals.length,
          lastSessionDate: sessionWithContext.userContext.recentSessions[0]?.date || null
        }
      };
      setUserContext(contextWithStats);

      return sessionWithContext.session;

    } catch (err) {
      console.error('Error starting new session:', err);
      setError(err instanceof Error ? err.message : 'Failed to start new session');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadUserContext = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const context = await UserService.getUserContext(user.id);
      setUserContext(context);

    } catch (err) {
      console.error('Error loading user context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user context');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const updateUser = useCallback(async (updates: { name?: string; preferences?: Record<string, any> }) => {
    if (!user) {
      throw new Error('No user available to update');
    }

    try {
      setLoading(true);
      setError(null);

      const updatedUser = await UserService.updateUser(user.id, updates);
      
      setUser(updatedUser);
      
      // Update app context
      dispatch({ type: 'SET_USER', payload: updatedUser });

      // Refresh context
      await loadUserContext();

    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, dispatch, loadUserContext]);

  const clearUser = useCallback(() => {
    UserService.clearCurrentUser();
    setUser(null);
    setIsNewUser(false);
    setUserContext(null);
    setCurrentSession(null);
    setError(null);
    
    // Clear app context
    dispatch({ type: 'RESET_STATE' });
  }, [dispatch]);

  return {
    // User state
    user,
    isNewUser,
    userContext,
    
    // Session state
    currentSession,
    
    // Loading states
    loading,
    initializing,
    
    // Error state
    error,
    
    // Actions
    initializeUser,
    startNewSession,
    loadUserContext,
    updateUser,
    clearUser,
  };
}
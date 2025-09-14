import { useState, useEffect, useCallback } from 'react';
import { User, Session, Goal } from '../types';
import { UserService, UserContextResponse } from '../services/UserService';
import { SessionService, SessionWithContext } from '../services/SessionService';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

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
  const { user: authUser, loading: authLoading } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [userContext, setUserContext] = useState<UserContextResponse | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize user when auth user is available
  useEffect(() => {
    let isCancelled = false;
    
    const initializeFromAuth = async () => {
      if (authLoading) return; // Wait for auth to load
      if (isCancelled) return; // Prevent race conditions
      
      try {
        setInitializing(true);
        setError(null);

        if (authUser) {
          // Try to load existing user from our database
          try {
            const context = await UserService.getUserContext();
            if (isCancelled) return;
            
            setUser(context.user);
            setUserContext(context);
            setIsNewUser(false);
            
            // Update app context
            dispatch({ type: 'SET_USER', payload: context.user });
          } catch (err) {
            if (isCancelled) return;
            
            console.warn('User not found in database, creating new record:', err);
            // User is authenticated but not in our database yet
            // Auto-initialize the user
            try {
              console.log('Auto-initializing user...');
              const result = await UserService.initializeUser();
              if (isCancelled) return;
              
              console.log('User initialized successfully:', result);
              
              setUser(result.user);
              setIsNewUser(result.isNewUser);
              
              if (result.context) {
                setUserContext(result.context);
              }

              // Update app context
              dispatch({ type: 'SET_USER', payload: result.user });
              console.log('User state updated in app context');
            } catch (initError) {
              if (isCancelled) return;
              console.error('Failed to initialize user:', initError);
              setError(initError instanceof Error ? initError.message : 'Failed to initialize user');
            }
          }
        } else {
          // No authenticated user
          if (isCancelled) return;
          setUser(null);
          setUserContext(null);
          setIsNewUser(false);
          dispatch({ type: 'SET_USER', payload: undefined });
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Error during initialization:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize user session');
      } finally {
        if (!isCancelled) {
          setInitializing(false);
        }
      }
    };

    initializeFromAuth();
    
    return () => {
      isCancelled = true;
    };
  }, [authUser, authLoading, dispatch]);

  // Sync current session with app context
  useEffect(() => {
    if (currentSession) {
      dispatch({ type: 'SET_CURRENT_SESSION', payload: currentSession });
    }
  }, [currentSession, dispatch]);

  const initializeUser = useCallback(async () => {
    if (!authUser) {
      throw new Error('User must be authenticated first');
    }

    try {
      setLoading(true);
      setError(null);

      const result = await UserService.initializeUser();
      
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
  }, [authUser, dispatch]);

  const startNewSession = useCallback(async (): Promise<Session> => {
    if (!user) {
      throw new Error('No user available to start session');
    }

    // Prevent duplicate session creation
    if (loading) {
      throw new Error('Session creation already in progress');
    }

    try {
      setLoading(true);
      setError(null);

      const sessionWithContext = await SessionService.initializeSession();
      
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
  }, [user, loading]);

  const loadUserContext = useCallback(async () => {
    if (!authUser) return;

    try {
      setLoading(true);
      setError(null);

      const context = await UserService.getUserContext();
      setUserContext(context);

    } catch (err) {
      console.error('Error loading user context:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user context');
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  const updateUser = useCallback(async (updates: { name?: string; preferences?: Record<string, any> }) => {
    if (!authUser) {
      throw new Error('User must be authenticated');
    }

    try {
      setLoading(true);
      setError(null);

      const updatedUser = await UserService.updateUser(updates);
      
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
  }, [authUser, dispatch, loadUserContext]);

  const clearUser = useCallback(() => {
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
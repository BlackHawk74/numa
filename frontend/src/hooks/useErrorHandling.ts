// Hook for comprehensive error handling and user feedback

import { useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { ErrorHandler, NetworkMonitor, ErrorInfo } from '../utils/errorHandling';

export function useErrorHandling() {
  const { state, dispatch } = useAppContext();
  const { globalError, isOnline, retryState } = state;

  // Handle network status changes
  useEffect(() => {
    const unsubscribe = NetworkMonitor.addListener((online) => {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: online });
      
      if (!online) {
        const networkError: ErrorInfo = {
          type: 'network',
          message: 'Network connection lost',
          userMessage: 'You appear to be offline. Please check your internet connection.',
          retryable: true,
          severity: 'medium',
          timestamp: new Date(),
        };
        dispatch({ type: 'SET_GLOBAL_ERROR', payload: networkError });
      } else if (globalError?.type === 'network') {
        // Clear network error when back online
        dispatch({ type: 'SET_GLOBAL_ERROR', payload: undefined });
      }
    });

    return unsubscribe;
  }, [dispatch, globalError]);

  // Handle and log errors
  const handleError = useCallback((error: unknown, context?: Record<string, any>) => {
    const errorInfo = ErrorHandler.parseError(error, context);
    ErrorHandler.logError(errorInfo);
    dispatch({ type: 'SET_GLOBAL_ERROR', payload: errorInfo });
  }, [dispatch]);

  // Clear current error
  const clearError = useCallback(() => {
    dispatch({ type: 'SET_GLOBAL_ERROR', payload: undefined });
    dispatch({ type: 'SET_RETRY_STATE', payload: undefined });
  }, [dispatch]);

  // Retry with error handling
  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: {
      maxAttempts?: number;
      baseDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<T> => {
    const maxAttempts = config?.maxAttempts || 3;
    
    try {
      return await ErrorHandler.withRetry(
        operation,
        {
          maxAttempts,
          baseDelay: config?.baseDelay || 1000,
          maxDelay: 10000,
          backoffFactor: 2,
        },
        (attempt, error) => {
          dispatch({
            type: 'SET_RETRY_STATE',
            payload: { operation: operationName, attempt, maxAttempts },
          });
          
          config?.onRetry?.(attempt, error);
        }
      );
    } catch (error) {
      dispatch({ type: 'SET_RETRY_STATE', payload: undefined });
      handleError(error, { operation: operationName });
      throw error;
    } finally {
      dispatch({ type: 'SET_RETRY_STATE', payload: undefined });
    }
  }, [dispatch, handleError]);

  // Test connectivity
  const testConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const isConnected = await NetworkMonitor.testConnectivity();
      dispatch({ type: 'SET_ONLINE_STATUS', payload: isConnected });
      return isConnected;
    } catch (error) {
      dispatch({ type: 'SET_ONLINE_STATUS', payload: false });
      return false;
    }
  }, [dispatch]);

  // Handle API errors with automatic retry for retryable errors
  const handleApiError = useCallback(async (
    error: unknown,
    operation: () => Promise<any>,
    operationName: string
  ) => {
    const errorInfo = ErrorHandler.parseError(error);
    
    if (errorInfo.retryable && errorInfo.type === 'network') {
      // Test connectivity first
      const isConnected = await testConnectivity();
      
      if (isConnected) {
        // Retry the operation
        try {
          return await retryOperation(operation, operationName);
        } catch (retryError) {
          handleError(retryError, { operation: operationName, retried: true });
        }
      }
    }
    
    handleError(error, { operation: operationName });
  }, [handleError, retryOperation, testConnectivity]);

  // Graceful degradation helper
  const withGracefulDegradation = useCallback(<T>(
    primaryOperation: () => Promise<T>,
    fallbackOperation?: () => Promise<T> | T,
    operationName: string = 'operation'
  ): Promise<T> => {
    return primaryOperation().catch(async (error) => {
      console.warn(`Primary ${operationName} failed, attempting fallback:`, error);
      
      if (fallbackOperation) {
        try {
          const result = await fallbackOperation();
          console.log(`Fallback ${operationName} succeeded`);
          return result;
        } catch (fallbackError) {
          console.error(`Fallback ${operationName} also failed:`, fallbackError);
          handleError(fallbackError, { 
            operation: operationName, 
            fallbackAttempted: true,
            primaryError: error.message,
          });
          throw fallbackError;
        }
      }
      
      handleError(error, { operation: operationName });
      throw error;
    });
  }, [handleError]);

  return {
    // State
    globalError,
    isOnline,
    retryState,
    
    // Actions
    handleError,
    clearError,
    retryOperation,
    testConnectivity,
    handleApiError,
    withGracefulDegradation,
  };
}
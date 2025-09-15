// Enhanced API client for Numa AI Therapist backend with comprehensive error handling

import { STTResponse, TherapyResponse, Session, Goal, User } from '../types';
import { ErrorHandler, NetworkMonitor } from './errorHandling';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class ApiClient {
  private static baseUrl = API_BASE_URL;
  private static requestTimeout = 30000; // 30 seconds
  private static retryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  /**
   * Enhanced fetch with timeout, retry logic, and error handling
   */
  static async enhancedFetch(
    url: string,
    options: RequestInit = {},
    retryable: boolean = true
  ): Promise<Response> {

    // Check network connectivity first
    if (!NetworkMonitor.getStatus()) {
      throw new Error('No internet connection available');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

    const fetchOptions: RequestInit = {
      ...options,
      signal: controller.signal,
    };

    const operation = async (): Promise<Response> => {
      try {
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        
        throw error;
      }
    };

    if (retryable) {
      return ErrorHandler.withRetry(
        operation,
        this.retryConfig,
        (attempt, error) => {
          console.warn(`API request attempt ${attempt} failed:`, error.message);
        }
      );
    } else {
      return operation();
    }
  }

  /**
   * Send audio for speech-to-text processing with enhanced error handling
   */
  static async speechToText(audioBlob: Blob): Promise<STTResponse> {
    try {
      // Validate audio blob
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Audio recording is empty');
      }

      if (audioBlob.size < 1000) {
        throw new Error('Audio recording is too short');
      }

      if (audioBlob.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('Audio file is too large');
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await this.enhancedFetch(`${this.baseUrl}/api/stt`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      
      // Validate response
      if (!result.transcription) {
        throw new Error('No transcription received from speech-to-text service');
      }

      return result;
    } catch (error) {
      const errorInfo = ErrorHandler.parseError(error, {
        operation: 'speechToText',
        audioBlobSize: audioBlob?.size,
      });
      ErrorHandler.logError(errorInfo);
      throw error;
    }
  }

  /**
   * Send message to therapy AI with enhanced error handling
   */
  static async sendTherapyMessage(
    userId: string,
    message: string,
    sessionId?: string
  ): Promise<TherapyResponse> {
    try {
      // Validate inputs
      if (!userId || userId.trim().length === 0) {
        throw new Error('User ID is required');
      }

      if (!message || message.trim().length === 0) {
        throw new Error('Message cannot be empty');
      }

      if (message.length > 1000) {
        throw new Error('Message is too long (max 1000 characters)');
      }

      const response = await this.enhancedFetch(`${this.baseUrl}/api/therapy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId.trim(),
          message: message.trim(),
          sessionId,
        }),
      });

      const result = await response.json();
      
      // Validate response
      if (!result.response) {
        throw new Error('No response received from therapy AI');
      }

      return result;
    } catch (error) {
      const errorInfo = ErrorHandler.parseError(error, {
        operation: 'sendTherapyMessage',
        userId,
        messageLength: message?.length,
        sessionId,
      });
      ErrorHandler.logError(errorInfo);
      throw error;
    }
  }

  /**
   * Get text-to-speech audio (fallback)
   */
  static async textToSpeech(text: string, voice?: string): Promise<Blob> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice,
      }),
    });

    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Create a new session
   */
  static async createSession(userId: string): Promise<Session> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Session creation error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.session || result;
  }

  /**
   * Get user sessions
   */
  static async getUserSessions(userId: string): Promise<Session[]> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/sessions/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Get sessions error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.sessions || [];
  }

  /**
   * Get user goals
   */
  static async getUserGoals(userId: string): Promise<Goal[]> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/goals?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Get goals error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Update session
   */
  static async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Session update error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a new user
   */
  static async createUser(name?: string, preferences?: Record<string, any>): Promise<User> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, preferences }),
    });

    if (!response.ok) {
      throw new Error(`User creation error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.user;
  }

  /**
   * Get user by ID
   */
  static async getUser(userId: string): Promise<User> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Get user error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.user;
  }

  /**
   * Get user with context (recent sessions and active goals)
   */
  static async getUserContext(userId: string): Promise<{
    user: User;
    recentSessions: Session[];
    activeGoals: Goal[];
    context: { sessionCount: number; goalCount: number; lastSessionDate: string | null };
  }> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/users/${userId}/context`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Get user context error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Initialize a new session with user context
   */
  static async initializeSession(userId: string): Promise<{
    session: Session;
    userContext: { user: User; recentSessions: Session[]; activeGoals: Goal[] };
  }> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/sessions/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Session initialization error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, updates: { name?: string; preferences?: Record<string, any> }): Promise<User> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`User update error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.user;
  }

  /**
   * Create a new goal
   */
  static async createGoal(userId: string, description: string, targetDate?: string): Promise<Goal> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/goals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, description, targetDate }),
    });

    if (!response.ok) {
      throw new Error(`Goal creation error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.goal;
  }

  /**
   * Update goal
   */
  static async updateGoal(goalId: string, updates: { description?: string; status?: 'active' | 'completed' | 'cancelled'; targetDate?: string; progressNote?: string; }): Promise<Goal> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/goals/${goalId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Goal update error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.goal;
  }

  /**
   * Complete a goal
   */
  static async completeGoal(goalId: string, progressNote?: string): Promise<Goal> {
    const response = await this.enhancedFetch(`${this.baseUrl}/api/goals/${goalId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ progressNote }),
    });

    if (!response.ok) {
      throw new Error(`Goal completion error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.goal;
  }
}

// Export default instance for convenience
export const apiClient = {
  get: async (url: string, options?: { params?: Record<string, any>; headers?: Record<string, string> }) => {
    const searchParams = options?.params ? new URLSearchParams(options.params).toString() : '';
    const fullUrl = `${API_BASE_URL}${url}${searchParams ? `?${searchParams}` : ''}`;
    const response = await ApiClient.enhancedFetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return { data: await response.json() };
  },

  post: async (url: string, data?: any, options?: { headers?: Record<string, string> }) => {
    const response = await ApiClient.enhancedFetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return { data: await response.json() };
  },

  put: async (url: string, data?: any, options?: { headers?: Record<string, string> }) => {
    const response = await ApiClient.enhancedFetch(`${API_BASE_URL}${url}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return { data: await response.json() };
  },

  delete: async (url: string, options?: { headers?: Record<string, string> }) => {
    const response = await ApiClient.enhancedFetch(`${API_BASE_URL}${url}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) throw new Error(`API error: ${response.statusText}`);
    return { data: await response.json() };
  },
};
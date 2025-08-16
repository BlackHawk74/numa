// API client for Numa AI Therapist backend

import { STTResponse, TherapyResponse, Session, Goal, User } from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export class ApiClient {
  private static baseUrl = API_BASE_URL;

  /**
   * Send audio for speech-to-text processing
   */
  static async speechToText(audioBlob: Blob): Promise<STTResponse> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const response = await fetch(`${this.baseUrl}/api/stt`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`STT API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Send message to therapy AI
   */
  static async sendTherapyMessage(
    userId: string,
    message: string,
    sessionId?: string
  ): Promise<TherapyResponse> {
    const response = await fetch(`${this.baseUrl}/api/therapy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        message,
        sessionId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Therapy API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get text-to-speech audio (fallback)
   */
  static async textToSpeech(text: string, voice?: string): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/api/tts`, {
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
    const response = await fetch(`${this.baseUrl}/api/sessions`, {
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
    const response = await fetch(`${this.baseUrl}/api/sessions?userId=${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Get sessions error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get user goals
   */
  static async getUserGoals(userId: string): Promise<Goal[]> {
    const response = await fetch(`${this.baseUrl}/api/goals?userId=${userId}`, {
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
    const response = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, {
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
    const response = await fetch(`${this.baseUrl}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        preferences,
      }),
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
    const response = await fetch(`${this.baseUrl}/api/users/${userId}`, {
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
}
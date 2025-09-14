import { useCallback, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { ApiClient } from '../utils/apiClient';
import { Message, TherapyResponse } from '../types';
import { ttsService } from '../services/TTSService';

export function useConversation() {
  const { state, dispatch } = useAppContext();
  const { conversationState, user, currentSession } = state;
  
  // Simple rate limiting state
  const [lastRequestTime, setLastRequestTime] = useState(0);
  const [requestCount, setRequestCount] = useState(0);

  // Send a message to the therapy AI
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!user) {
      dispatch({ 
        type: 'SET_CONVERSATION_ERROR', 
        payload: 'User not initialized' 
      });
      return;
    }

    // Validate message content
    if (!content || content.trim().length === 0) {
      dispatch({ 
        type: 'SET_CONVERSATION_ERROR', 
        payload: 'Message cannot be empty' 
      });
      return;
    }

    // Simple rate limiting (max 10 requests per minute)
    const now = Date.now();
    const oneMinute = 60 * 1000;
    
    if (now - lastRequestTime < oneMinute) {
      if (requestCount >= 10) {
        dispatch({ 
          type: 'SET_CONVERSATION_ERROR', 
          payload: 'Too many requests. Please wait a moment before trying again.' 
        });
        return;
      }
      setRequestCount(prev => prev + 1);
    } else {
      setRequestCount(1);
      setLastRequestTime(now);
    }

    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: undefined });

      console.log('Sending message to therapy API:', content);

      // Add user message to conversation immediately for better UX
      const userMessage: Message = {
        id: Date.now().toString(),
        speaker: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Send to therapy API (retries handled within ApiClient.enhancedFetch)
      const response: TherapyResponse = await ApiClient.sendTherapyMessage(
        user.id,
        content.trim(),
        currentSession?.id
      );

      // Response validation handled inside ApiClient; if it returns, we have a valid response

      console.log('Received therapy response:', response);

      // Extract response values for type safety
      const aiResponse = response.response;
      const aiEmotion = response.emotion;
      const sessionId = response.sessionId;
      const suggestedGoal = response.goal;

      // Add AI response to conversation
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        speaker: 'numa',
        content: aiResponse,
        timestamp: new Date(),
        emotion: aiEmotion,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });

      // Update session if provided
      if (sessionId && sessionId !== currentSession?.id) {
        // Session was created or updated, refresh session info
        try {
          const sessions = await ApiClient.getUserSessions(user.id);
          const latestSession = sessions.find(s => s.id === sessionId);
          if (latestSession) {
            dispatch({ type: 'SET_CURRENT_SESSION', payload: latestSession });
          }
        } catch (sessionError) {
          console.warn('Failed to update session info:', sessionError);
        }
      }

      // Speak the AI response using TTS service
      try {
        dispatch({ type: 'SET_PLAYING', payload: true });
        
        const ttsResult = await ttsService.speak(aiResponse, {
          // Use therapy-optimized settings
          rate: 0.85,
          pitch: 1.0,
          volume: 0.9
        });

        if (ttsResult.success && ttsResult.controls) {
          dispatch({ type: 'SET_TTS_CONTROLS', payload: ttsResult.controls });
        }

        if (!ttsResult.success) {
          console.warn('TTS failed:', ttsResult.error);
        }
      } catch (error) {
        console.error('TTS error:', error);
      } finally {
        dispatch({ type: 'SET_PLAYING', payload: false });
      }

      // Handle goal creation if provided
      if (suggestedGoal) {
        console.log('New goal suggested:', suggestedGoal);
        // Could dispatch a goal-related action here if needed
      }

    } catch (error) {
      console.error('Send message error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: errorMessage });
      
      // Add error message to conversation for user feedback
      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        speaker: 'numa',
        content: "I'm having trouble processing your message right now. Could you please try again?",
        timestamp: new Date(),
        emotion: 'neutral',
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorMsg });
      
      // Try to speak the error message
      try {
        await ttsService.speak(errorMsg.content, {
          rate: 0.85,
          pitch: 1.0,
          volume: 0.9
        });
      } catch (ttsError) {
        console.warn('Failed to speak error message:', ttsError);
      }
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [user, currentSession, dispatch, lastRequestTime, requestCount]);

  // Process audio input
  const processAudioMessage = useCallback(async (audioBlob: Blob, sessionId?: string): Promise<void> => {
    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: undefined });

      console.log('Processing audio blob:', audioBlob.size, 'bytes, type:', audioBlob.type);

      // Validate audio blob
      if (audioBlob.size === 0) {
        throw new Error('Audio recording is empty. Please try recording again.');
      }

      if (audioBlob.size < 1000) {
        throw new Error('Audio recording is too short. Please speak for at least 1 second.');
      }

      // Convert speech to text with retry logic
      let sttResponse;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount < maxRetries) {
        try {
          sttResponse = await ApiClient.speechToText(audioBlob);
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          console.warn(`STT attempt ${retryCount} failed:`, error);
          
          if (retryCount >= maxRetries) {
            throw error; // Re-throw after max retries
          }
          
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!sttResponse) {
        throw new Error('Failed to transcribe audio');
      }

      console.log('STT response:', sttResponse);
      
      if (sttResponse.transcription && sttResponse.transcription.trim().length > 0) {
        // Send the transcribed message
        await sendMessage(sttResponse.transcription);
      } else {
        dispatch({ 
          type: 'SET_CONVERSATION_ERROR', 
          payload: 'Could not understand what you said. Please try speaking more clearly.' 
        });
      }
    } catch (error) {
      console.error('Process audio error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process audio';
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [sendMessage, dispatch]);

  // Start a new session
  const startNewSession = useCallback(async (): Promise<void> => {
    if (!user) {
      dispatch({ 
        type: 'SET_CONVERSATION_ERROR', 
        payload: 'User not initialized' 
      });
      return;
    }

    try {
      console.log('Creating new session for user:', user.id);
      const session = await ApiClient.createSession(user.id);
      console.log('New session created:', session);
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
      dispatch({ type: 'CLEAR_MESSAGES' });
    } catch (error) {
      console.error('Failed to create session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: errorMessage });
    }
  }, [user, dispatch]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'SET_CONVERSATION_ERROR', payload: undefined });
  }, [dispatch]);

  // Clear messages only
  const clearMessages = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  }, [dispatch]);

  return {
    conversationState,
    messages: conversationState.messages,
    isProcessing: conversationState.isProcessing,
    error: conversationState.error,
    sendMessage,
    processAudioMessage,
    startNewSession,
    clearConversation,
    clearMessages,
  };
}
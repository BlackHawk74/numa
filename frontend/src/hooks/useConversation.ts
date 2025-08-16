import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { ApiClient } from '../utils/apiClient';
import { Message } from '../types';

export function useConversation() {
  const { state, dispatch } = useAppContext();
  const { conversationState, user, currentSession } = state;

  // Send a message to the therapy AI
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!user) {
      dispatch({ 
        type: 'SET_CONVERSATION_ERROR', 
        payload: 'User not initialized' 
      });
      return;
    }

    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: undefined });

      // Add user message to conversation
      const userMessage: Message = {
        id: Date.now().toString(),
        speaker: 'user',
        content,
        timestamp: new Date(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Send to therapy API
      const response = await ApiClient.sendTherapyMessage(
        user.id,
        content,
        currentSession?.id
      );

      // Add AI response to conversation
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        speaker: 'numa',
        content: response.response,
        timestamp: new Date(),
        emotion: response.emotion,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: aiMessage });

      // Handle goal creation if provided
      if (response.goal) {
        // Goal handling would be implemented here
        console.log('New goal created:', response.goal);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_PROCESSING', payload: false });
    }
  }, [user, currentSession, dispatch]);

  // Process audio input
  const processAudioMessage = useCallback(async (audioBlob: Blob): Promise<void> => {
    try {
      dispatch({ type: 'SET_PROCESSING', payload: true });
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: undefined });

      // Convert speech to text
      const sttResponse = await ApiClient.speechToText(audioBlob);
      
      if (sttResponse.transcription) {
        // Send the transcribed message
        await sendMessage(sttResponse.transcription);
      } else {
        dispatch({ 
          type: 'SET_CONVERSATION_ERROR', 
          payload: 'Could not transcribe audio. Please try again.' 
        });
      }
    } catch (error) {
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
      const session = await ApiClient.createSession(user.id);
      dispatch({ type: 'SET_CURRENT_SESSION', payload: session });
      dispatch({ type: 'CLEAR_MESSAGES' });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create session';
      dispatch({ type: 'SET_CONVERSATION_ERROR', payload: errorMessage });
    }
  }, [user, dispatch]);

  // Clear conversation
  const clearConversation = useCallback(() => {
    dispatch({ type: 'CLEAR_MESSAGES' });
    dispatch({ type: 'SET_CONVERSATION_ERROR', payload: undefined });
  }, [dispatch]);

  return {
    conversationState,
    sendMessage,
    processAudioMessage,
    startNewSession,
    clearConversation,
  };
}
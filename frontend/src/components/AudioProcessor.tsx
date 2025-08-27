import { useEffect, useRef } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useConversation } from '../hooks/useConversation';

interface AudioProcessorProps {
  onAudioProcessed?: (transcription: string) => void;
  onError?: (error: string) => void;
}

export function AudioProcessor({ onAudioProcessed, onError }: AudioProcessorProps) {
  const { audioState, speakText } = useAudio();
  const { conversationState } = useConversation();
  const lastMessageRef = useRef<string>('');

  // Auto-play AI responses
  useEffect(() => {
    const messages = conversationState.messages;
    const lastMessage = messages[messages.length - 1];
    
    if (
      lastMessage && 
      lastMessage.speaker === 'numa' && 
      lastMessage.content !== lastMessageRef.current &&
      !audioState.isPlaying &&
      !conversationState.isProcessing
    ) {
      lastMessageRef.current = lastMessage.content;
      speakText(lastMessage.content).catch(error => {
        console.warn('Failed to speak AI response:', error);
        // Don't call onError for TTS failures as they're not critical
      });
    }
  }, [conversationState.messages, audioState.isPlaying, conversationState.isProcessing, speakText]);

  // Handle audio errors
  useEffect(() => {
    if (audioState.error && onError) {
      onError(audioState.error);
    }
  }, [audioState.error, onError]);

  // Handle conversation errors
  useEffect(() => {
    if (conversationState.error && onError) {
      onError(conversationState.error);
    }
  }, [conversationState.error, onError]);

  return null; // This component handles audio processing logic without rendering UI
}

export default AudioProcessor;
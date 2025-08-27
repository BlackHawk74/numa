import { useCallback, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { AudioUtils } from '../utils/audioUtils';
import { ttsService } from '../services/TTSService';

export function useAudio() {
  const { state, dispatch } = useAppContext();
  const { audioState } = state;

  // Initialize audio system
  const initializeAudio = useCallback(async () => {
    if (audioState.isInitialized) return;

    try {
      // Check for audio support
      if (!AudioUtils.isRecordingSupported()) {
        throw new Error('Audio recording is not supported in your browser');
      }

      if (!AudioUtils.isSpeechSynthesisSupported()) {
        console.warn('Speech synthesis is not supported in your browser');
      }

      // Get supported formats
      const supportedFormats = AudioUtils.getSupportedAudioFormats();
      dispatch({ type: 'SET_SUPPORTED_FORMATS', payload: supportedFormats });

      // Get best voice for therapy
      const bestVoice = AudioUtils.getBestTherapyVoice();
      if (bestVoice) {
        dispatch({ type: 'SET_CURRENT_VOICE', payload: bestVoice });
      }

      dispatch({ type: 'SET_AUDIO_INITIALIZED', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize audio system';
      dispatch({ type: 'SET_AUDIO_ERROR', payload: errorMessage });
    }
  }, [audioState.isInitialized, dispatch]);

  // Initialize audio permissions
  const requestPermission = useCallback(async () => {
    try {
      const hasPermission = await AudioUtils.requestMicrophonePermission();
      dispatch({ type: 'SET_AUDIO_PERMISSION', payload: hasPermission });
      
      if (!hasPermission) {
        dispatch({ 
          type: 'SET_AUDIO_ERROR', 
          payload: 'Microphone permission is required for voice interaction' 
        });
      }
      
      return hasPermission;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      dispatch({ type: 'SET_AUDIO_ERROR', payload: errorMessage });
      return false;
    }
  }, [dispatch]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!audioState.hasPermission) {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;
    }

    try {
      dispatch({ type: 'SET_AUDIO_ERROR', payload: undefined });
      await AudioUtils.startRecording();
      dispatch({ type: 'SET_RECORDING', payload: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      dispatch({ type: 'SET_AUDIO_ERROR', payload: errorMessage });
    }
  }, [audioState.hasPermission, dispatch, requestPermission]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!audioState.isRecording) return null;

    try {
      const audioBlob = await AudioUtils.stopRecording();
      dispatch({ type: 'SET_RECORDING', payload: false });
      
      // Validate audio quality
      const { isValid, issues } = AudioUtils.validateAudioQuality(audioBlob);
      if (!isValid) {
        dispatch({ 
          type: 'SET_AUDIO_ERROR', 
          payload: `Audio quality issues: ${issues.join(', ')}` 
        });
        return null;
      }
      
      return audioBlob;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to stop recording';
      dispatch({ type: 'SET_AUDIO_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_RECORDING', payload: false });
      return null;
    }
  }, [audioState.isRecording, dispatch]);

  // Play text using enhanced TTS service with fallback
  const speakText = useCallback(async (text: string, options?: { useFallback?: boolean }) => {
    try {
      dispatch({ type: 'SET_PLAYING', payload: true });
      dispatch({ type: 'SET_AUDIO_ERROR', payload: undefined });
      
      const result = await ttsService.speak(text, {
        voice: audioState.currentVoice,
        useFallback: options?.useFallback,
        rate: 0.85, // Therapy-optimized rate
        pitch: 1.0,
        volume: 0.9
      });

      if (!result.success) {
        throw new Error(result.error || 'TTS failed');
      }

      // Store playback controls if available
      if (result.controls) {
        dispatch({ type: 'SET_TTS_CONTROLS', payload: result.controls });
      }

      dispatch({ type: 'SET_PLAYING', payload: false });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to play speech';
      dispatch({ type: 'SET_AUDIO_ERROR', payload: errorMessage });
      dispatch({ type: 'SET_PLAYING', payload: false });
      throw error;
    }
  }, [dispatch, audioState.currentVoice]);

  // Stop current speech
  const stopSpeaking = useCallback(() => {
    ttsService.stop();
    AudioUtils.stopSpeaking(); // Fallback for legacy calls
    dispatch({ type: 'SET_PLAYING', payload: false });
    dispatch({ type: 'SET_TTS_CONTROLS', payload: undefined });
  }, [dispatch]);

  // Pause current speech
  const pauseSpeaking = useCallback(() => {
    ttsService.pause();
  }, []);

  // Resume paused speech
  const resumeSpeaking = useCallback(() => {
    ttsService.resume();
  }, []);

  // Get available voices
  const getAvailableVoices = useCallback(() => {
    return ttsService.getAvailableVoices();
  }, []);

  // Set preferred voice
  const setVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    ttsService.setVoice(voice);
    dispatch({ type: 'SET_CURRENT_VOICE', payload: voice || undefined });
  }, [dispatch]);

  // Get TTS service status
  const getTTSStatus = useCallback(() => {
    return ttsService.getStatus();
  }, []);

  // Test TTS functionality
  const testTTS = useCallback(async () => {
    try {
      const results = await ttsService.testTTS();
      return results;
    } catch (error) {
      console.error('TTS test failed:', error);
      return { browserTTS: false, fallbackTTS: false };
    }
  }, []);

  // Initialize audio system on mount
  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      AudioUtils.cleanup();
    };
  }, []);

  return {
    audioState,
    initializeAudio,
    requestPermission,
    startRecording,
    stopRecording,
    speakText,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    getAvailableVoices,
    setVoice,
    getTTSStatus,
    testTTS,
  };
}
import { useState, useCallback, useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useConversation } from '../hooks/useConversation';
import { useErrorHandling } from '../hooks/useErrorHandling';
import { AudioUtils } from '../utils/audioUtils';
import { ProcessingIndicator, AudioWaveform, ConnectionStatus, RetryIndicator } from './LoadingStates';

interface VoiceInterfaceProps {
  className?: string;
}

export function VoiceInterface({ className = '' }: VoiceInterfaceProps) {
  const { 
    audioState, 
    startRecording, 
    stopRecording, 
    requestPermission, 
    initializeAudio,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    getAvailableVoices,
    setVoice
  } = useAudio();
  const { processAudioMessage, conversationState, sendMessage } = useConversation();
  const { 
    isOnline, 
    retryState, 
    handleError, 
    retryOperation, 
    withGracefulDegradation 
  } = useErrorHandling();
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioQualityIssues, setAudioQualityIssues] = useState<string[]>([]);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  // Initialize audio system and permissions on mount
  useEffect(() => {
    if (!audioState.isInitialized) {
      initializeAudio();
    } else if (!audioState.hasPermission) {
      requestPermission();
    }
  }, [audioState.isInitialized, audioState.hasPermission, initializeAudio, requestPermission]);

  // Set up real-time waveform visualization and recording timer
  useEffect(() => {
    if (audioState.isRecording || isRecordingActive) {
      // Set up callback for real waveform data
      AudioUtils.setWaveformCallback((frequencyData: Float32Array) => {
        // Convert frequency data to visualization bars
        const barCount = 20;
        const dataStep = Math.floor(frequencyData.length / barCount);
        const bars: number[] = [];
        
        for (let i = 0; i < barCount; i++) {
          const start = i * dataStep;
          const end = start + dataStep;
          let sum = 0;
          
          for (let j = start; j < end && j < frequencyData.length; j++) {
            // Convert from dB to linear scale and normalize
            const value = Math.pow(10, frequencyData[j] / 20);
            sum += value;
          }
          
          const average = sum / dataStep;
          // Scale to 0-100 range for visualization
          const height = Math.max(5, Math.min(100, average * 1000));
          bars.push(height);
        }
        
        setWaveformData(bars);
      });

      // Start recording timer
      const startTime = Date.now();
      const timer = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);

      return () => {
        clearInterval(timer);
        AudioUtils.setWaveformCallback(() => {}); // Clear callback
      };
    } else {
      setWaveformData([]);
      setRecordingDuration(0);
      AudioUtils.setWaveformCallback(() => {}); // Clear callback
    }
  }, [audioState.isRecording, isRecordingActive]);

  // Handle click to toggle recording (press-to-talk) with enhanced error handling
  const handleRecordingToggle = useCallback(async () => {
    if (conversationState.isProcessing || audioState.isPlaying) return;
    
    // Debounce rapid clicks (prevent clicks within 500ms)
    const now = Date.now();
    if (now - lastClickTime < 500) {
      console.log('Ignoring rapid click');
      return;
    }
    setLastClickTime(now);
    
    if (!audioState.isRecording && !isRecordingActive) {
      // Start recording with error handling
      console.log('Starting recording...');
      setIsRecordingActive(true);
      setAudioQualityIssues([]);
      
      try {
        await withGracefulDegradation(
          () => startRecording(),
          undefined,
          'start recording'
        );
      } catch (error) {
        handleError(error, { operation: 'startRecording' });
        setIsRecordingActive(false);
      }
    } else if (audioState.isRecording && isRecordingActive) {
      // Stop recording with enhanced processing
      console.log('Stopping recording...');
      setIsRecordingActive(false);
      
      try {
        const audioBlob = await retryOperation(
          () => stopRecording(),
          'stop recording',
          { maxAttempts: 2 }
        );
        
        if (audioBlob) {
          console.log('Audio recorded:', audioBlob.size, 'bytes');
          
          // Validate audio quality
          const { isValid, issues } = AudioUtils.validateAudioQuality(audioBlob);
          
          if (!isValid) {
            console.warn('Audio quality issues:', issues);
            setAudioQualityIssues(issues);
            return;
          }

          // Process the audio message with retry logic and rate limiting
          await retryOperation(
            () => processAudioMessage(audioBlob),
            'process audio message',
            { 
              maxAttempts: 2, // Reduced from 3 to prevent rate limiting
              onRetry: (attempt) => {
                console.log(`Retrying audio processing (attempt ${attempt})`);
              }
            }
          );
        } else {
          handleError(new Error('No audio recorded'), { operation: 'stopRecording' });
        }
      } catch (error) {
        handleError(error, { operation: 'processRecording' });
      }
    }
  }, [
    audioState.isRecording, 
    audioState.isPlaying, 
    conversationState.isProcessing, 
    isRecordingActive, 
    lastClickTime,
    startRecording, 
    stopRecording, 
    processAudioMessage,
    handleError,
    retryOperation,
    withGracefulDegradation
  ]);

  // Handle permission request with error handling
  const handlePermissionRequest = useCallback(async () => {
    try {
      await retryOperation(
        () => requestPermission(),
        'request microphone permission',
        { maxAttempts: 1 } // Don't retry permission requests
      );
    } catch (error) {
      handleError(error, { operation: 'requestPermission' });
    }
  }, [requestPermission, retryOperation, handleError]);

  // Render initialization loading if needed
  if (!audioState.isInitialized) {
    return (
      <div className={`flex flex-col items-center space-y-6 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-charcoal rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-charcoal mb-2">
            Initializing Audio System
          </h3>
          <p className="text-sm text-gray-500">
            Setting up microphone and speech capabilities...
          </p>
        </div>
        {audioState.error && (
          <div className="text-charcoal text-sm text-center max-w-md bg-gray-50 border border-gray-200 rounded-lg p-4">
            {audioState.error}
          </div>
        )}
      </div>
    );
  }

  // Render permission request if needed
  if (!audioState.hasPermission) {
    return (
      <div className={`flex flex-col items-center space-y-6 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-charcoal mb-2">
            Microphone Access Required
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Numa needs access to your microphone to have voice conversations with you.
          </p>
          <button
            onClick={handlePermissionRequest}
            className="px-6 py-3 bg-charcoal text-white rounded-lg hover:bg-charcoal-light transition-colors duration-200 font-medium"
          >
            Enable Microphone
          </button>
        </div>
        {audioState.error && (
          <div className="text-charcoal text-sm text-center max-w-md bg-gray-50 border border-gray-200 rounded-lg p-4">
            {audioState.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* Connection Status */}
      <ConnectionStatus isOnline={isOnline} className="self-end" />
      
      {/* Retry Indicator */}
      {retryState && (
        <RetryIndicator 
          attempt={retryState.attempt} 
          maxAttempts={retryState.maxAttempts}
          className="mb-4"
        />
      )}

      {/* Waveform Visualization and Recording Timer */}
      {(audioState.isRecording || isRecordingActive) && (
        <div className="space-y-3">
          {/* Recording Timer */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-charcoal rounded-full animate-pulse" />
              <span className="text-charcoal font-mono text-sm font-medium">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* Waveform */}
          <AudioWaveform 
            isActive={audioState.isRecording || isRecordingActive}
            className="h-16"
          />
        </div>
      )}

      {/* Microphone Button */}
      <div className="relative">
        <button
          onClick={handleRecordingToggle}
          disabled={conversationState.isProcessing || audioState.isPlaying}
          className={`
            group w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 transform select-none border-2
            ${isRecordingActive || audioState.isRecording
              ? 'bg-charcoal border-charcoal scale-95 shadow-medium'
              : 'bg-white border-charcoal hover:bg-charcoal hover:scale-105'
            }
            ${(conversationState.isProcessing || audioState.isPlaying)
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer shadow-soft hover:shadow-medium'
            }
            focus:outline-none focus:ring-4 focus:ring-charcoal/10
          `}
        >
          {conversationState.isProcessing ? (
            <div className="w-6 h-6 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
          ) : (audioState.isRecording || isRecordingActive) ? (
            <svg
              className="w-8 h-8 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className={`w-8 h-8 transition-colors duration-200 ${
                isRecordingActive || audioState.isRecording ? 'text-white' : 'text-charcoal group-hover:text-white'
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Recording indicator */}
        {(audioState.isRecording || isRecordingActive) && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-charcoal rounded-full animate-pulse flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* TTS Controls */}
      {audioState.isPlaying && audioState.ttsControls && (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => audioState.ttsControls?.isPaused ? resumeSpeaking() : pauseSpeaking()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-charcoal rounded-lg transition-colors duration-200 flex items-center space-x-2 border border-gray-200"
          >
            {audioState.ttsControls.isPaused ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Resume</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Pause</span>
              </>
            )}
          </button>
          
          <button
            onClick={stopSpeaking}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-charcoal rounded-lg transition-colors duration-200 flex items-center space-x-2 border border-gray-300"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">Stop</span>
          </button>
        </div>
      )}

      {/* Voice Selector */}
      {!audioState.isRecording && !audioState.isPlaying && (
        <div className="relative">
          <button
            onClick={() => setShowVoiceSelector(!showVoiceSelector)}
            className="px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 text-charcoal rounded-lg transition-colors duration-200 flex items-center space-x-2 border border-gray-200"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">{audioState.currentVoice?.name || 'Select Voice'}</span>
          </button>

          {showVoiceSelector && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-medium max-h-48 overflow-y-auto min-w-64 z-10">
              <div className="p-2">
                <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Available Voices</div>
                {getAvailableVoices().map((voice, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setVoice(voice);
                      setShowVoiceSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors duration-200 ${
                      audioState.currentVoice?.name === voice.name 
                        ? 'bg-charcoal text-white' 
                        : 'hover:bg-gray-50 text-charcoal'
                    }`}
                  >
                    <div className="font-medium">{voice.name}</div>
                    <div className="text-xs opacity-75">
                      {voice.lang} • {voice.localService ? 'Local' : 'Remote'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="text-center max-w-md">
        {audioState.isRecording || isRecordingActive ? (
          <div className="space-y-2">
            <p className="text-charcoal font-medium">
              Recording... Click again to stop
            </p>
            <p className="text-sm text-gray-500">
              Speak clearly into your microphone
            </p>
          </div>
        ) : conversationState.isProcessing ? (
          <ProcessingIndicator 
            isProcessing={true}
            message="Processing your message..."
            className="justify-center"
          />
        ) : audioState.isPlaying ? (
          <p className="text-charcoal font-medium">
            Numa is speaking...
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-charcoal font-medium">
              Click the microphone to start recording
            </p>
            <p className="text-sm text-gray-500">
              Click once to start, click again to stop and send
            </p>
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-gray-400 space-y-1">
            <div>Recording: {audioState.isRecording ? 'Yes' : 'No'}</div>
            <div>Processing: {conversationState.isProcessing ? 'Yes' : 'No'}</div>
            <div>Playing: {audioState.isPlaying ? 'Yes' : 'No'}</div>
            <div>Has Permission: {audioState.hasPermission ? 'Yes' : 'No'}</div>
            <div>Initialized: {audioState.isInitialized ? 'Yes' : 'No'}</div>
            <button
              onClick={() => sendMessage("Hello, I'm feeling a bit anxious today.")}
              className="mt-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-charcoal rounded border border-gray-200 text-xs font-medium transition-colors duration-200"
              disabled={conversationState.isProcessing}
            >
              Test Conversation
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {(audioState.error || conversationState.error || audioQualityIssues.length > 0) && (
        <div className="text-charcoal text-sm text-center max-w-md bg-gray-50 border border-gray-200 rounded-lg p-4">
          {audioState.error || conversationState.error}
          {audioQualityIssues.length > 0 && (
            <div className="mt-3">
              <div className="font-semibold text-charcoal">Audio Quality Issues:</div>
              <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                {audioQualityIssues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceInterface;
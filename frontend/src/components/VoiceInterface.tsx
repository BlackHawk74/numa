import { useState, useCallback, useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useConversation } from '../hooks/useConversation';
import { AudioUtils } from '../utils/audioUtils';

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
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioQualityIssues, setAudioQualityIssues] = useState<string[]>([]);
  const [showVoiceSelector, setShowVoiceSelector] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

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

  // Handle click to toggle recording (press-to-talk)
  const handleRecordingToggle = useCallback(async () => {
    if (conversationState.isProcessing || audioState.isPlaying) return;
    
    if (!audioState.isRecording && !isRecordingActive) {
      // Start recording
      console.log('Starting recording...');
      setIsRecordingActive(true);
      setAudioQualityIssues([]);
      
      try {
        await startRecording();
      } catch (error) {
        console.error('Failed to start recording:', error);
        setIsRecordingActive(false);
      }
    } else if (audioState.isRecording && isRecordingActive) {
      // Stop recording
      console.log('Stopping recording...');
      setIsRecordingActive(false);
      
      try {
        const audioBlob = await stopRecording();
        
        if (audioBlob) {
          console.log('Audio recorded:', audioBlob.size, 'bytes');
          
          // Validate audio quality
          const { isValid, issues } = AudioUtils.validateAudioQuality(audioBlob);
          
          if (!isValid) {
            console.warn('Audio quality issues:', issues);
            setAudioQualityIssues(issues);
            return;
          }

          // Process the audio message
          await processAudioMessage(audioBlob);
        } else {
          console.warn('No audio blob received');
        }
      } catch (error) {
        console.error('Failed to process recording:', error);
      }
    }
  }, [audioState.isRecording, audioState.isPlaying, conversationState.isProcessing, isRecordingActive, startRecording, stopRecording, processAudioMessage]);

  // Handle permission request
  const handlePermissionRequest = useCallback(async () => {
    await requestPermission();
  }, [requestPermission]);

  // Render initialization loading if needed
  if (!audioState.isInitialized) {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-therapy-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Initializing Audio System
          </h3>
          <p className="text-sm text-gray-500">
            Setting up microphone and speech capabilities...
          </p>
        </div>
        {audioState.error && (
          <div className="text-red-500 text-sm text-center max-w-md">
            {audioState.error}
          </div>
        )}
      </div>
    );
  }

  // Render permission request if needed
  if (!audioState.hasPermission) {
    return (
      <div className={`flex flex-col items-center space-y-4 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Microphone Access Required
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Numa needs access to your microphone to have voice conversations with you.
          </p>
          <button
            onClick={handlePermissionRequest}
            className="px-6 py-2 bg-therapy-accent text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Enable Microphone
          </button>
        </div>
        {audioState.error && (
          <div className="text-red-500 text-sm text-center max-w-md">
            {audioState.error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* Waveform Visualization and Recording Timer */}
      {(audioState.isRecording || isRecordingActive) && (
        <div className="space-y-3">
          {/* Recording Timer */}
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-red-50 border border-red-200 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-600 font-mono text-sm">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* Waveform */}
          <div className="flex items-center justify-center space-x-1 h-16">
            {waveformData.map((height, index) => (
              <div
                key={index}
                className="bg-red-500 rounded-full transition-all duration-100"
                style={{
                  width: '3px',
                  height: `${Math.max(4, height * 0.6)}px`,
                  opacity: 0.7 + (height / 100) * 0.3,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Microphone Button */}
      <div className="relative">
        <button
          onClick={handleRecordingToggle}
          disabled={conversationState.isProcessing || audioState.isPlaying}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 transform select-none
            ${isRecordingActive || audioState.isRecording
              ? 'bg-red-500 scale-110 shadow-lg animate-pulse'
              : 'bg-therapy-accent hover:bg-blue-600 hover:scale-105'
            }
            ${(conversationState.isProcessing || audioState.isPlaying)
              ? 'opacity-50 cursor-not-allowed'
              : 'cursor-pointer shadow-md hover:shadow-lg'
            }
            focus:outline-none focus:ring-4 focus:ring-blue-300
          `}
        >
          {conversationState.isProcessing ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
              className="w-8 h-8 text-white"
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
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* TTS Controls */}
      {audioState.isPlaying && audioState.ttsControls && (
        <div className="flex items-center space-x-4">
          <button
            onClick={() => audioState.ttsControls?.isPaused ? resumeSpeaking() : pauseSpeaking()}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors flex items-center space-x-2"
          >
            {audioState.ttsControls.isPaused ? (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                <span>Resume</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Pause</span>
              </>
            )}
          </button>
          
          <button
            onClick={stopSpeaking}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
            </svg>
            <span>Stop</span>
          </button>
        </div>
      )}

      {/* Voice Selector */}
      {!audioState.isRecording && !audioState.isPlaying && (
        <div className="relative">
          <button
            onClick={() => setShowVoiceSelector(!showVoiceSelector)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span>{audioState.currentVoice?.name || 'Select Voice'}</span>
          </button>

          {showVoiceSelector && (
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto min-w-64 z-10">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-2">Available Voices</div>
                {getAvailableVoices().map((voice, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setVoice(voice);
                      setShowVoiceSelector(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                      audioState.currentVoice?.name === voice.name ? 'bg-therapy-accent text-white' : ''
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
            <p className="text-red-500 font-medium">
              🎤 Recording... Click again to stop
            </p>
            <p className="text-sm text-gray-500">
              Speak clearly into your microphone
            </p>
          </div>
        ) : conversationState.isProcessing ? (
          <p className="text-gray-600">
            Processing your message...
          </p>
        ) : audioState.isPlaying ? (
          <p className="text-therapy-accent">
            Numa is speaking...
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-gray-600">
              Click the microphone to start recording
            </p>
            <p className="text-sm text-gray-500">
              Click once to start, click again to stop and send
            </p>
          </div>
        )}
        
        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-xs text-gray-400">
            <div>Recording: {audioState.isRecording ? 'Yes' : 'No'}</div>
            <div>Processing: {conversationState.isProcessing ? 'Yes' : 'No'}</div>
            <div>Playing: {audioState.isPlaying ? 'Yes' : 'No'}</div>
            <div>Has Permission: {audioState.hasPermission ? 'Yes' : 'No'}</div>
            <div>Initialized: {audioState.isInitialized ? 'Yes' : 'No'}</div>
            <button
              onClick={() => sendMessage("Hello, I'm feeling a bit anxious today.")}
              className="mt-2 px-2 py-1 bg-gray-200 rounded text-xs"
              disabled={conversationState.isProcessing}
            >
              Test Conversation
            </button>

          </div>
        )}
      </div>

      {/* Error Display */}
      {(audioState.error || conversationState.error || audioQualityIssues.length > 0) && (
        <div className="text-red-500 text-sm text-center max-w-md">
          {audioState.error || conversationState.error}
          {audioQualityIssues.length > 0 && (
            <div className="mt-2">
              <div className="font-medium">Audio Quality Issues:</div>
              <ul className="list-disc list-inside">
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
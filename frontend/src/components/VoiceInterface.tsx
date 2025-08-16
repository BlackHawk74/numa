import React, { useState, useCallback, useEffect } from 'react';
import { useAudio } from '../hooks/useAudio';
import { useConversation } from '../hooks/useConversation';
import { AudioUtils } from '../utils/audioUtils';

interface VoiceInterfaceProps {
  className?: string;
}

export function VoiceInterface({ className = '' }: VoiceInterfaceProps) {
  const { audioState, startRecording, stopRecording, requestPermission, initializeAudio } = useAudio();
  const { processAudioMessage, conversationState } = useConversation();
  const [isPressed, setIsPressed] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [audioQualityIssues, setAudioQualityIssues] = useState<string[]>([]);

  // Initialize audio system and permissions on mount
  useEffect(() => {
    if (!audioState.isInitialized) {
      initializeAudio();
    } else if (!audioState.hasPermission) {
      requestPermission();
    }
  }, [audioState.isInitialized, audioState.hasPermission, initializeAudio, requestPermission]);

  // Set up real-time waveform visualization
  useEffect(() => {
    if (audioState.isRecording) {
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
    } else {
      setWaveformData([]);
      AudioUtils.setWaveformCallback(() => {}); // Clear callback
    }

    return () => {
      AudioUtils.setWaveformCallback(() => {}); // Clear callback on cleanup
    };
  }, [audioState.isRecording]);

  // Handle mouse/touch events for press-and-hold
  const handleMouseDown = useCallback(async () => {
    if (conversationState.isProcessing || audioState.isPlaying) return;
    
    setIsPressed(true);
    await startRecording();
  }, [startRecording, conversationState.isProcessing, audioState.isPlaying]);

  const handleMouseUp = useCallback(async () => {
    if (!isPressed) return;
    
    setIsPressed(false);
    setAudioQualityIssues([]);
    
    const audioBlob = await stopRecording();
    
    if (audioBlob) {
      // Validate audio quality
      const { isValid, issues } = AudioUtils.validateAudioQuality(audioBlob);
      
      if (!isValid) {
        setAudioQualityIssues(issues);
        return;
      }

      // Optimize audio for transmission
      try {
        const optimizedBlob = await AudioUtils.optimizeAudioForTransmission(audioBlob);
        await processAudioMessage(optimizedBlob);
      } catch (error) {
        console.warn('Failed to optimize audio, using original:', error);
        await processAudioMessage(audioBlob);
      }
    }
  }, [isPressed, stopRecording, processAudioMessage]);

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
      {/* Waveform Visualization */}
      {audioState.isRecording && (
        <div className="flex items-center justify-center space-x-1 h-16">
          {waveformData.map((height, index) => (
            <div
              key={index}
              className="bg-therapy-accent rounded-full transition-all duration-100"
              style={{
                width: '3px',
                height: `${Math.max(4, height * 0.6)}px`,
                opacity: 0.7 + (height / 100) * 0.3,
              }}
            />
          ))}
        </div>
      )}

      {/* Microphone Button */}
      <div className="relative">
        <button
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          disabled={conversationState.isProcessing || audioState.isPlaying}
          className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-200 transform
            ${isPressed || audioState.isRecording
              ? 'bg-red-500 scale-110 shadow-lg'
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
        {audioState.isRecording && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-pulse flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center max-w-md">
        {audioState.isRecording ? (
          <p className="text-therapy-accent font-medium">
            Listening... Release to send
          </p>
        ) : conversationState.isProcessing ? (
          <p className="text-gray-600">
            Processing your message...
          </p>
        ) : audioState.isPlaying ? (
          <p className="text-therapy-accent">
            Numa is speaking...
          </p>
        ) : (
          <p className="text-gray-600">
            Hold the microphone button and speak to Numa
          </p>
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
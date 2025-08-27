// Demo component to test TTS functionality

import { useState, useEffect } from 'react';
import { ttsService } from '../services/TTSService';
import { SpeechPlaybackControls } from '../types';

export function TTSDemo() {
  const [text, setText] = useState('Hello, this is Numa. I am here to help you with your therapy session.');
  const [isPlaying, setIsPlaying] = useState(false);
  const [controls, setControls] = useState<SpeechPlaybackControls | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [status, setStatus] = useState<any>(null);
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    // Load voices and status
    const loadData = () => {
      const availableVoices = ttsService.getAvailableVoices();
      setVoices(availableVoices);

      const serviceStatus = ttsService.getStatus();
      setStatus(serviceStatus);

      // Set best therapy voice as default
      const bestVoice = ttsService.getBestTherapyVoice();
      if (bestVoice) {
        setSelectedVoice(bestVoice);
        ttsService.setVoice(bestVoice);
      }
    };

    loadData();

    // Retry loading voices after a delay (some browsers load them asynchronously)
    setTimeout(loadData, 1000);
  }, []);

  const handleSpeak = async () => {
    try {
      setIsPlaying(true);

      const result = await ttsService.speak(text, {
        voice: selectedVoice || undefined,
        rate: 0.85,
        pitch: 1.0,
        volume: 0.9
      });

      if (result.success && result.controls) {
        setControls(result.controls);
      }

      if (!result.success) {
        alert(`TTS failed: ${result.error}`);
      }
    } catch (error) {
      alert(`TTS error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsPlaying(false);
      setControls(null);
    }
  };

  const handleStop = () => {
    ttsService.stop();
    setIsPlaying(false);
    setControls(null);
  };

  const handlePause = () => {
    if (controls) {
      controls.pause();
    }
  };

  const handleResume = () => {
    if (controls) {
      controls.resume();
    }
  };

  const handleVoiceChange = (voiceName: string) => {
    const voice = voices.find(v => v.name === voiceName) || null;
    setSelectedVoice(voice);
    ttsService.setVoice(voice);
  };

  const handleTestTTS = async () => {
    try {
      const results = await ttsService.testTTS();
      setTestResults(results);
    } catch (error) {
      setTestResults({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">TTS Demo</h1>

      {/* Service Status */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Service Status</h2>
        {status && (
          <div className="text-sm">
            <p>Browser TTS Available: {status.browserTTSAvailable ? '✅' : '❌'}</p>
            <p>Fallback TTS Available: {status.fallbackTTSAvailable ? '✅' : '❌'}</p>
            <p>Initialized: {status.isInitialized ? '✅' : '❌'}</p>
            <p>Current Voice: {status.currentVoice || 'None'}</p>
            {status.lastError && <p className="text-red-600">Error: {status.lastError}</p>}
          </div>
        )}
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Voice Selection</h2>
        <select
          value={selectedVoice?.name || ''}
          onChange={(e) => handleVoiceChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        >
          <option value="">Default Voice</option>
          {voices.map((voice, index) => (
            <option key={index} value={voice.name}>
              {voice.name} ({voice.lang}) {voice.localService ? '[Local]' : '[Remote]'}
            </option>
          ))}
        </select>
        <p className="text-sm text-gray-600 mt-1">
          Available voices: {voices.length}
        </p>
      </div>

      {/* Text Input */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Text to Speak</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded h-32"
          placeholder="Enter text to speak..."
        />
        <p className="text-sm text-gray-600 mt-1">
          Characters: {text.length}/1000
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-3">
        <button
          onClick={handleSpeak}
          disabled={isPlaying || !text.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isPlaying ? 'Speaking...' : 'Speak'}
        </button>

        <button
          onClick={handleStop}
          disabled={!isPlaying}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
        >
          Stop
        </button>

        {controls && (
          <>
            <button
              onClick={controls.isPaused ? handleResume : handlePause}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              {controls.isPaused ? 'Resume' : 'Pause'}
            </button>
          </>
        )}

        <button
          onClick={handleTestTTS}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test TTS
        </button>
      </div>

      {/* Test Results */}
      {testResults && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Test Results</h2>
          <div className="text-sm">
            {testResults.error ? (
              <p className="text-red-600">Error: {testResults.error}</p>
            ) : (
              <>
                <p>Browser TTS: {testResults.browserTTS ? '✅ Working' : '❌ Failed'}</p>
                <p>Fallback TTS: {testResults.fallbackTTS ? '✅ Working' : '❌ Failed'}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Current Status */}
      {(isPlaying || controls) && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Current Status</h2>
          <div className="text-sm">
            <p>Playing: {isPlaying ? '✅' : '❌'}</p>
            {controls && (
              <>
                <p>Speaking: {controls.isSpeaking ? '✅' : '❌'}</p>
                <p>Paused: {controls.isPaused ? '✅' : '❌'}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TTSDemo;
// Integration test for TTS functionality

import { ttsService } from '../TTSService';

// Mock window.speechSynthesis for testing
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(() => []),
  speaking: false,
  paused: false,
  onvoiceschanged: null,
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'en-US',
  onstart: null,
  onend: null,
  onerror: null,
}));

// Mock window object
Object.defineProperty(global, 'window', {
  value: {
    speechSynthesis: mockSpeechSynthesis,
    SpeechSynthesisUtterance: mockSpeechSynthesisUtterance,
    URL: {
      createObjectURL: jest.fn(() => 'mock-blob-url'),
      revokeObjectURL: jest.fn(),
    },
    Audio: jest.fn().mockImplementation(() => ({
      play: jest.fn().mockResolvedValue(undefined),
      onended: null,
      onerror: null,
    })),
  },
  writable: true,
});

// Mock fetch for fallback TTS
global.fetch = jest.fn();

describe('TTS Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should initialize TTS service', () => {
      const status = ttsService.getStatus();
      expect(status.isInitialized).toBe(true);
    });

    it('should detect browser TTS availability', () => {
      const status = ttsService.getStatus();
      expect(status.browserTTSAvailable).toBe(true);
    });
  });

  describe('Voice Management', () => {
    it('should get available voices', () => {
      const mockVoices = [
        { name: 'Voice 1', lang: 'en-US', localService: true },
        { name: 'Voice 2', lang: 'en-GB', localService: false },
      ] as SpeechSynthesisVoice[];

      mockSpeechSynthesis.getVoices.mockReturnValue(mockVoices);

      const voices = ttsService.getAvailableVoices();
      expect(voices).toEqual(mockVoices);
    });

    it('should set and get current voice', () => {
      const mockVoice = { name: 'Test Voice', lang: 'en-US' } as SpeechSynthesisVoice;
      
      ttsService.setVoice(mockVoice);
      const currentVoice = ttsService.getCurrentVoice();
      
      expect(currentVoice).toEqual(mockVoice);
    });
  });

  describe('Text-to-Speech Functionality', () => {
    it('should validate input text', async () => {
      // Test empty text
      const emptyResult = await ttsService.speak('');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toBe('Text input is required');

      // Test long text
      const longText = 'a'.repeat(1001);
      const longResult = await ttsService.speak(longText);
      expect(longResult.success).toBe(false);
      expect(longResult.error).toBe('Text too long (max 1000 characters)');
    });

    it('should attempt browser TTS first', async () => {
      const speakPromise = ttsService.speak('Hello world');

      // Simulate successful speech start
      setTimeout(() => {
        const utterance = mockSpeechSynthesisUtterance.mock.results[0]?.value;
        if (utterance && utterance.onstart) {
          utterance.onstart();
        }
      }, 10);

      const result = await speakPromise;

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(result.usedFallback).toBe(false);
    });

    it('should use therapy-optimized settings', async () => {
      const speakPromise = ttsService.speak('Hello world');

      // Simulate speech start
      setTimeout(() => {
        const utterance = mockSpeechSynthesisUtterance.mock.results[0]?.value;
        if (utterance && utterance.onstart) {
          utterance.onstart();
        }
      }, 10);

      await speakPromise;

      const utterance = mockSpeechSynthesisUtterance.mock.results[0]?.value;
      expect(utterance.rate).toBe(0.85); // Slower for therapy
      expect(utterance.volume).toBe(0.9);
    });
  });

  describe('Playback Controls', () => {
    it('should provide stop functionality', () => {
      mockSpeechSynthesis.speaking = true;
      
      ttsService.stop();
      
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should provide pause functionality', () => {
      mockSpeechSynthesis.speaking = true;
      mockSpeechSynthesis.paused = false;
      
      ttsService.pause();
      
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    it('should provide resume functionality', () => {
      mockSpeechSynthesis.paused = true;
      
      ttsService.resume();
      
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });
  });

  describe('Fallback TTS', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        headers: {
          get: jest.fn(() => 'audio/wav'),
        },
        blob: jest.fn().mockResolvedValue(new Blob(['mock audio data'])),
      });
    });

    it('should use fallback when explicitly requested', async () => {
      const result = await ttsService.speak('Hello world', { useFallback: true });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/tts'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Hello world'),
        })
      );

      expect(result.usedFallback).toBe(true);
    });

    it('should handle fallback TTS errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await ttsService.speak('Hello world', { useFallback: true });

      expect(result.success).toBe(false);
      expect(result.usedFallback).toBe(true);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Service Status', () => {
    it('should return comprehensive service status', () => {
      const status = ttsService.getStatus();

      expect(status).toEqual({
        browserTTSAvailable: true,
        fallbackTTSAvailable: expect.any(Boolean),
        currentVoice: expect.any(String),
        isInitialized: true,
        lastError: undefined,
      });
    });
  });
});
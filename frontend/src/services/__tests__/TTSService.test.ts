// Tests for TTSService integration and fallback behavior

import { TTSService } from '../TTSService';
import { speechSynthesis } from '../../utils/speechSynthesis';

// Mock the speechSynthesis utility
jest.mock('../../utils/speechSynthesis', () => ({
  speechSynthesis: {
    isSupported: jest.fn(),
    speak: jest.fn(),
    stop: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    getAvailableVoices: jest.fn(),
    setVoice: jest.fn(),
    getCurrentVoice: jest.fn(),
    getBestTherapyVoice: jest.fn(),
    testSpeech: jest.fn(),
  }
}));

// Mock the API client
jest.mock('../../utils/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  }
}));

describe('TTSService', () => {
  let ttsService: TTSService;
  const mockSpeechSynthesis = speechSynthesis as jest.Mocked<typeof speechSynthesis>;

  beforeEach(() => {
    jest.clearAllMocks();
    ttsService = TTSService.getInstance();
  });

  describe('Browser TTS Integration', () => {
    it('should use browser TTS when available', async () => {
      mockSpeechSynthesis.isSupported.mockReturnValue(true);
      mockSpeechSynthesis.speak.mockResolvedValue({
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        isPaused: false,
        isSpeaking: true,
      });

      const result = await ttsService.speak('Hello world');

      expect(result.success).toBe(true);
      expect(result.usedFallback).toBe(false);
      expect(result.controls).toBeDefined();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith('Hello world', expect.any(Object));
    });

    it('should handle browser TTS errors gracefully', async () => {
      mockSpeechSynthesis.isSupported.mockReturnValue(true);
      mockSpeechSynthesis.speak.mockRejectedValue(new Error('Browser TTS failed'));

      const result = await ttsService.speak('Hello world');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Browser TTS failed');
    });

    it('should validate text input', async () => {
      const emptyResult = await ttsService.speak('');
      expect(emptyResult.success).toBe(false);
      expect(emptyResult.error).toBe('Text input is required');

      const longText = 'a'.repeat(1001);
      const longResult = await ttsService.speak(longText);
      expect(longResult.success).toBe(false);
      expect(longResult.error).toBe('Text too long (max 1000 characters)');
    });
  });

  describe('Fallback TTS Integration', () => {
    beforeEach(() => {
      // Mock API client for fallback tests
      const { apiClient } = require('../../utils/apiClient');
      apiClient.get.mockResolvedValue({ data: { browserTTSAvailable: false } });
      apiClient.post.mockResolvedValue({ 
        data: new ArrayBuffer(1024) // Mock audio data
      });
    });

    it('should use fallback TTS when browser TTS is not available', async () => {
      mockSpeechSynthesis.isSupported.mockReturnValue(false);

      const result = await ttsService.speak('Hello world');

      expect(result.usedFallback).toBe(true);
    });

    it('should use fallback TTS when explicitly requested', async () => {
      mockSpeechSynthesis.isSupported.mockReturnValue(true);

      const result = await ttsService.speak('Hello world', { useFallback: true });

      expect(result.usedFallback).toBe(true);
    });

    it('should handle fallback TTS errors', async () => {
      const { apiClient } = require('../../utils/apiClient');
      apiClient.post.mockRejectedValue(new Error('Fallback TTS failed'));
      
      mockSpeechSynthesis.isSupported.mockReturnValue(false);

      const result = await ttsService.speak('Hello world');

      expect(result.success).toBe(false);
      expect(result.usedFallback).toBe(true);
      expect(result.error).toContain('Fallback TTS failed');
    });
  });

  describe('Voice Management', () => {
    it('should get available voices', () => {
      const mockVoices = [
        { name: 'Voice 1', lang: 'en-US' },
        { name: 'Voice 2', lang: 'en-GB' }
      ] as SpeechSynthesisVoice[];

      mockSpeechSynthesis.getAvailableVoices.mockReturnValue(mockVoices);

      const voices = ttsService.getAvailableVoices();
      expect(voices).toEqual(mockVoices);
    });

    it('should set and get current voice', () => {
      const mockVoice = { name: 'Test Voice', lang: 'en-US' } as SpeechSynthesisVoice;
      
      mockSpeechSynthesis.getCurrentVoice.mockReturnValue(mockVoice);

      ttsService.setVoice(mockVoice);
      const currentVoice = ttsService.getCurrentVoice();

      expect(mockSpeechSynthesis.setVoice).toHaveBeenCalledWith(mockVoice);
      expect(currentVoice).toEqual(mockVoice);
    });

    it('should get best therapy voice', () => {
      const mockVoice = { name: 'Therapy Voice', lang: 'en-US' } as SpeechSynthesisVoice;
      mockSpeechSynthesis.getBestTherapyVoice.mockReturnValue(mockVoice);

      const bestVoice = ttsService.getBestTherapyVoice();
      expect(bestVoice).toEqual(mockVoice);
    });
  });

  describe('Playback Controls', () => {
    it('should provide stop functionality', () => {
      ttsService.stop();
      expect(mockSpeechSynthesis.stop).toHaveBeenCalled();
    });

    it('should provide pause functionality', () => {
      ttsService.pause();
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    it('should provide resume functionality', () => {
      ttsService.resume();
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });
  });

  describe('Service Status', () => {
    it('should return service status', () => {
      mockSpeechSynthesis.isSupported.mockReturnValue(true);
      mockSpeechSynthesis.getCurrentVoice.mockReturnValue({
        name: 'Test Voice',
        lang: 'en-US'
      } as SpeechSynthesisVoice);

      const status = ttsService.getStatus();

      expect(status.browserTTSAvailable).toBe(true);
      expect(status.currentVoice).toBe('Test Voice');
      expect(status.isInitialized).toBe(true);
    });
  });

  describe('TTS Testing', () => {
    it('should test both browser and fallback TTS', async () => {
      mockSpeechSynthesis.testSpeech.mockResolvedValue(true);
      
      const results = await ttsService.testTTS();

      expect(results.browserTTS).toBe(true);
      expect(mockSpeechSynthesis.testSpeech).toHaveBeenCalled();
    });

    it('should handle test failures gracefully', async () => {
      mockSpeechSynthesis.testSpeech.mockRejectedValue(new Error('Test failed'));

      const results = await ttsService.testTTS();

      expect(results.browserTTS).toBe(false);
    });
  });

  describe('Therapy-Specific Features', () => {
    it('should use therapy-optimized speech settings', async () => {
      mockSpeechSynthesis.isSupported.mockReturnValue(true);
      mockSpeechSynthesis.speak.mockResolvedValue({
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        isPaused: false,
        isSpeaking: true,
      });

      await ttsService.speak('Hello world');

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
        'Hello world',
        expect.objectContaining({
          rate: 0.85, // Slower rate for therapy
          pitch: 1.0,
          volume: 0.9
        })
      );
    });

    it('should automatically select best therapy voice when none specified', async () => {
      const mockTherapyVoice = { name: 'Therapy Voice', lang: 'en-US' } as SpeechSynthesisVoice;
      
      mockSpeechSynthesis.isSupported.mockReturnValue(true);
      mockSpeechSynthesis.getBestTherapyVoice.mockReturnValue(mockTherapyVoice);
      mockSpeechSynthesis.speak.mockResolvedValue({
        pause: jest.fn(),
        resume: jest.fn(),
        stop: jest.fn(),
        isPaused: false,
        isSpeaking: true,
      });

      await ttsService.speak('Hello world');

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledWith(
        'Hello world',
        expect.objectContaining({
          voice: mockTherapyVoice
        })
      );
    });
  });
});
/**
 * Integration tests for audio functionality
 * These tests verify that the audio utilities work correctly in a browser-like environment
 */

import { AudioUtils } from '../audioUtils';

describe('AudioUtils Integration Tests', () => {
  beforeEach(() => {
    // Reset any static state
    AudioUtils.cleanup();
  });

  afterEach(() => {
    AudioUtils.cleanup();
  });

  describe('Basic functionality checks', () => {
    it('should have all required methods', () => {
      expect(typeof AudioUtils.isRecordingSupported).toBe('function');
      expect(typeof AudioUtils.isSpeechSynthesisSupported).toBe('function');
      expect(typeof AudioUtils.getSupportedAudioFormats).toBe('function');
      expect(typeof AudioUtils.validateAudioQuality).toBe('function');
      expect(typeof AudioUtils.getAvailableVoices).toBe('function');
      expect(typeof AudioUtils.getBestTherapyVoice).toBe('function');
      expect(typeof AudioUtils.requestMicrophonePermission).toBe('function');
      expect(typeof AudioUtils.startRecording).toBe('function');
      expect(typeof AudioUtils.stopRecording).toBe('function');
      expect(typeof AudioUtils.convertToWav).toBe('function');
      expect(typeof AudioUtils.optimizeAudioForTransmission).toBe('function');
      expect(typeof AudioUtils.speakText).toBe('function');
      expect(typeof AudioUtils.stopSpeaking).toBe('function');
      expect(typeof AudioUtils.cleanup).toBe('function');
    });

    it('should handle missing browser APIs gracefully', () => {
      // These should not throw errors even if APIs are not available
      expect(() => AudioUtils.isRecordingSupported()).not.toThrow();
      expect(() => AudioUtils.isSpeechSynthesisSupported()).not.toThrow();
      expect(() => AudioUtils.getSupportedAudioFormats()).not.toThrow();
      expect(() => AudioUtils.getAvailableVoices()).not.toThrow();
      expect(() => AudioUtils.getBestTherapyVoice()).not.toThrow();
    });

    it('should validate audio quality correctly', () => {
      // Test with empty blob
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      const emptyResult = AudioUtils.validateAudioQuality(emptyBlob);
      expect(emptyResult.isValid).toBe(false);
      expect(emptyResult.issues.length).toBeGreaterThan(0);

      // Test with valid size blob
      const validBlob = new Blob([new ArrayBuffer(5000)], { type: 'audio/webm' });
      const validResult = AudioUtils.validateAudioQuality(validBlob);
      expect(validResult.isValid).toBe(true);
      expect(validResult.issues.length).toBe(0);

      // Test with invalid type
      const invalidBlob = new Blob(['test'], { type: 'text/plain' });
      const invalidResult = AudioUtils.validateAudioQuality(invalidBlob);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.issues).toContain('Invalid audio format');

      // Test with too large blob
      const largeBlob = new Blob([new ArrayBuffer(15 * 1024 * 1024)], { type: 'audio/webm' });
      const largeResult = AudioUtils.validateAudioQuality(largeBlob);
      expect(largeResult.isValid).toBe(false);
      expect(largeResult.issues).toContain('Audio recording is too large');
    });

    it('should handle audio conversion gracefully', async () => {
      const testBlob = new Blob([new ArrayBuffer(1000)], { type: 'audio/webm' });
      
      // Should not throw even if conversion fails
      const result = await AudioUtils.convertToWav(testBlob);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle audio optimization gracefully', async () => {
      const testBlob = new Blob([new ArrayBuffer(1000)], { type: 'audio/webm' });
      
      // Should not throw even if optimization fails
      const result = await AudioUtils.optimizeAudioForTransmission(testBlob);
      expect(result).toBeInstanceOf(Blob);
    });

    it('should handle cleanup gracefully', () => {
      // Should not throw even if nothing to clean up
      expect(() => AudioUtils.cleanup()).not.toThrow();
      
      // Should be safe to call multiple times
      expect(() => {
        AudioUtils.cleanup();
        AudioUtils.cleanup();
      }).not.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle speech synthesis errors gracefully', async () => {
      // Mock speechSynthesis to throw an error
      const originalSpeak = global.speechSynthesis?.speak;
      if (global.speechSynthesis) {
        global.speechSynthesis.speak = jest.fn().mockImplementation(() => {
          throw new Error('Speech synthesis failed');
        });
      }

      // Should handle the error gracefully
      if (AudioUtils.isSpeechSynthesisSupported()) {
        await expect(AudioUtils.speakText('test')).rejects.toThrow();
      }

      // Restore original
      if (global.speechSynthesis && originalSpeak) {
        global.speechSynthesis.speak = originalSpeak;
      }
    });

    it('should handle microphone permission errors gracefully', async () => {
      // Mock getUserMedia to reject
      const originalGetUserMedia = global.navigator?.mediaDevices?.getUserMedia;
      if (global.navigator?.mediaDevices) {
        global.navigator.mediaDevices.getUserMedia = jest.fn().mockRejectedValue(
          new Error('Permission denied')
        );
      }

      // Should handle the error gracefully
      if (AudioUtils.isRecordingSupported()) {
        await expect(AudioUtils.requestMicrophonePermission()).rejects.toThrow();
      }

      // Restore original
      if (global.navigator?.mediaDevices && originalGetUserMedia) {
        global.navigator.mediaDevices.getUserMedia = originalGetUserMedia;
      }
    });
  });

  describe('Waveform functionality', () => {
    it('should handle waveform callbacks safely', () => {
      // Should not throw when setting callback
      expect(() => {
        AudioUtils.setWaveformCallback((data: Float32Array) => {
          // Mock callback
        });
      }).not.toThrow();

      // Should not throw when clearing callback
      expect(() => {
        AudioUtils.setWaveformCallback(() => {});
      }).not.toThrow();

      // Should handle getting current waveform data
      const data = AudioUtils.getCurrentWaveformData();
      expect(data === null || data instanceof Float32Array).toBe(true);
    });
  });
});
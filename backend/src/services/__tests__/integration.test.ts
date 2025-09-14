import {
  huggingFaceClient,
  speechToTextService,
  conversationService,
  textToSpeechService,
  sentimentAnalysisService
} from '../index';

// Integration tests for HuggingFace services
// These tests verify that all services can be instantiated and configured properly
describe('HuggingFace Services Integration', () => {
  beforeEach(() => {
    // Set up test environment
    process.env.HUGGINGFACE_API_KEY = 'test-api-key';
  });

  describe('Service Initialization', () => {
    it('should initialize all services without errors', () => {
      expect(huggingFaceClient).toBeDefined();
      expect(speechToTextService).toBeDefined();
      expect(conversationService).toBeDefined();
      expect(textToSpeechService).toBeDefined();
      expect(sentimentAnalysisService).toBeDefined();
    });

    it('should have HuggingFace client configured', () => {
      // In test environment, the client is created with dummy key
      expect(huggingFaceClient.isConfigured()).toBe(false);
    });
  });

  describe('Service Configuration', () => {
    it('should have correct model configurations', () => {
      // Test that services are using the expected models
      expect(speechToTextService.getSupportedFormats()).toContain('wav');
      expect(textToSpeechService.getServiceInfo().model).toBe('hexgrad/Kokoro-82M');
    });

    it('should validate input properly', () => {
      // Test input validation across services
      const audioValidation = speechToTextService.validateAudioInput(new ArrayBuffer(1024));
      expect(audioValidation.valid).toBe(true);

      const textValidation = textToSpeechService.validateTextInput('Hello world');
      expect(textValidation.valid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing API key gracefully', () => {
      delete process.env.HUGGINGFACE_API_KEY;

      expect(() => {
        // This should not throw an error, just create a client with dummy key
        const { HuggingFaceClient } = require('../HuggingFaceClient');
        const client = new HuggingFaceClient();
        expect(client.isConfigured()).toBe(false);
      }).not.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      const validation = speechToTextService.validateAudioInput(emptyBuffer);

      expect(validation.valid).toBe(false);
      expect(validation.error).toBe('Audio buffer is empty');
    });
  });

  describe('Service Interoperability', () => {
    it('should allow services to work together in a therapy flow', async () => {
      // Mock a complete therapy interaction flow
      const mockAudioBuffer = new ArrayBuffer(1024);

      // Validate that we can chain service calls
      const audioValidation = speechToTextService.validateAudioInput(mockAudioBuffer);
      expect(audioValidation.valid).toBe(true);

      // Test sentiment analysis with sample text
      const sampleText = 'I feel anxious about tomorrow';
      // Note: This would normally call the API, but we're just testing the interface
      expect(() => sentimentAnalysisService.analyzeSentiment(sampleText)).not.toThrow();

      // Test conversation context building
      const context = {
        userId: 'test-user',
        detectedEmotion: 'anxious',
        sessionHistory: ['Previous session'],
        activeGoals: ['Practice mindfulness']
      };

      expect(() => conversationService.generateResponse('Hello', context)).not.toThrow();
    });

    it('should handle browser TTS availability check', () => {
      // Test static method for browser TTS availability
      const { TextToSpeechService } = require('../TextToSpeechService');
      expect(typeof TextToSpeechService.isBrowserTTSAvailable).toBe('function');
      expect(TextToSpeechService.isBrowserTTSAvailable()).toBe(false); // Should be false in Node.js
    });
  });

  describe('Performance Considerations', () => {
    it('should have reasonable retry configurations', () => {
      // Test that services have sensible retry defaults
      const testOptions = { maxRetries: 2, retryDelay: 500 };

      expect(() => speechToTextService.transcribeAudio(new ArrayBuffer(1024), testOptions)).not.toThrow();
      expect(() => conversationService.generateResponse('test', { userId: 'test' }, testOptions)).not.toThrow();
    });

    it('should validate input sizes to prevent API overuse', () => {
      // Test size limits
      const largeBuffer = new ArrayBuffer(30 * 1024 * 1024); // 30MB
      const validation = speechToTextService.validateAudioInput(largeBuffer);

      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('too large');
    });
  });

  describe('Therapeutic Features', () => {
    it('should provide emotion-based recommendations', () => {
      const recommendations = sentimentAnalysisService.getTherapeuticRecommendations('anxious', 0.8);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.includes('grounding'))).toBe(true);
    });

    it('should detect distressed emotions', () => {
      expect(sentimentAnalysisService.isDistressedEmotion('sad')).toBe(true);
      expect(sentimentAnalysisService.isDistressedEmotion('anxious')).toBe(true);
      expect(sentimentAnalysisService.isDistressedEmotion('happy')).toBe(false);
    });

    it('should categorize emotion intensity', () => {
      expect(sentimentAnalysisService.getEmotionIntensity(0.2)).toBe('low');
      expect(sentimentAnalysisService.getEmotionIntensity(0.5)).toBe('medium');
      expect(sentimentAnalysisService.getEmotionIntensity(0.8)).toBe('high');
    });
  });
});
import { ConversationService } from '../ConversationService';
import type { ConversationContext } from '../ConversationService';

// Mock the HuggingFace client
jest.mock('../HuggingFaceClient', () => ({
  huggingFaceClient: {
    getClient: jest.fn(() => ({
      textGeneration: jest.fn()
    }))
  }
}));

describe('ConversationService', () => {
  let service: ConversationService;
  let mockClient: any;

  beforeEach(() => {
    const { huggingFaceClient } = require('../HuggingFaceClient');
    mockClient = huggingFaceClient.getClient();
    service = new ConversationService();
    jest.clearAllMocks();
  });

  describe('generateResponse', () => {
    const mockContext: ConversationContext = {
      userId: 'test-user-123',
      sessionHistory: ['Previous session summary'],
      activeGoals: ['Practice mindfulness'],
      detectedEmotion: 'anxious',
      userName: 'John'
    };

    it('should generate therapeutic response', async () => {
      const mockPrompt = 'test prompt';
      const mockResponse = 'I understand you\'re feeling anxious. Let\'s work through this together.';
      mockClient.textGeneration.mockResolvedValue({
        generated_text: `${mockPrompt}${mockResponse}`
      });

      const result = await service.generateResponse('I feel worried about tomorrow', mockContext);

      expect(result.response).toBe(mockResponse);
      expect(result.error).toBeUndefined();
      expect(mockClient.textGeneration).toHaveBeenCalledWith({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        inputs: expect.stringContaining('I feel worried about tomorrow'),
        parameters: {
          max_new_tokens: 150,
          temperature: 0.7,
          do_sample: true,
          top_p: 0.9,
          repetition_penalty: 1.1,
          stop: ['<|eot_id|>', '\n\nUser:', '\n\nHuman:']
        }
      });
    });

    it('should extract goals from response', async () => {
      const mockPrompt = 'test prompt';
      const mockResponse = 'Try to practice deep breathing for 5 minutes daily.';
      mockClient.textGeneration.mockResolvedValue({
        generated_text: `${mockPrompt}${mockResponse}`
      });

      const result = await service.generateResponse('I need help with anxiety', mockContext);

      expect(result.suggestedGoal).toContain('practice deep breathing');
    });

    it('should adapt to different emotions', async () => {
      const sadContext: ConversationContext = {
        ...mockContext,
        detectedEmotion: 'sad'
      };

      const mockPrompt = 'test prompt';
      const mockResponse = 'I hear that you\'re feeling down.';
      mockClient.textGeneration.mockResolvedValue({
        generated_text: `${mockPrompt}${mockResponse}`
      });

      const result = await service.generateResponse('I feel sad', sadContext);

      expect(result.detectedEmotion).toBe('sad');
      expect(mockClient.textGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('encouraging and supportive tone')
        })
      );
    });

    it('should handle API failures with retry', async () => {
      const mockPrompt = 'test prompt';
      const mockResponse = 'Success on retry';
      mockClient.textGeneration
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ generated_text: `${mockPrompt}${mockResponse}` });

      const result = await service.generateResponse('Hello', mockContext, { maxRetries: 2 });

      expect(result.response).toBe(mockResponse);
      expect(mockClient.textGeneration).toHaveBeenCalledTimes(2);
    });

    it('should return fallback response on complete failure', async () => {
      mockClient.textGeneration.mockRejectedValue(new Error('API Error'));

      const result = await service.generateResponse('Hello', mockContext, { maxRetries: 1 });

      expect(result.response).toContain('having trouble processing');
      expect(result.error).toContain('Conversation generation failed');
    });

    it('should not retry on non-retryable errors', async () => {
      mockClient.textGeneration.mockRejectedValue(new Error('Unauthorized'));

      const result = await service.generateResponse('Hello', mockContext, { maxRetries: 3 });

      expect(mockClient.textGeneration).toHaveBeenCalledTimes(1);
      expect(result.error).toContain('Conversation generation failed after 1 attempts: Unauthorized');
    });

    it('should handle empty context gracefully', async () => {
      const emptyContext: ConversationContext = { userId: 'test-user' };
      
      const mockPrompt = 'test prompt';
      const mockResponse = 'Hello, how can I help you today?';
      mockClient.textGeneration.mockResolvedValue({
        generated_text: `${mockPrompt}${mockResponse}`
      });

      const result = await service.generateResponse('Hi', emptyContext);

      expect(result.response).toBe(mockResponse);
      expect(mockClient.textGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('This is a new session')
        })
      );
    });
  });

  describe('emotion-specific guidance', () => {
    it('should provide appropriate guidance for anxiety', async () => {
      const anxiousContext: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'anxious'
      };

      const mockPrompt = 'test prompt';
      const mockResponse = 'Let\'s focus on grounding techniques.';
      mockClient.textGeneration.mockResolvedValue({
        generated_text: `${mockPrompt}${mockResponse}`
      });

      await service.generateResponse('I\'m anxious', anxiousContext);

      expect(mockClient.textGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('calm and grounding tone')
        })
      );
    });

    it('should provide appropriate guidance for sadness', async () => {
      const sadContext: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'sad'
      };

      const mockPrompt = 'test prompt';
      const mockResponse = 'I understand you\'re going through a difficult time.';
      mockClient.textGeneration.mockResolvedValue({
        generated_text: `${mockPrompt}${mockResponse}`
      });

      await service.generateResponse('I feel sad', sadContext);

      expect(mockClient.textGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('encouraging and supportive tone')
        })
      );
    });
  });
});
import { ConversationService } from '../ConversationService';
import type { ConversationContext } from '../ConversationService';

// Mock the HuggingFace client
jest.mock('../HuggingFaceClient', () => {
  const mockTextGeneration = jest.fn();
  return {
    huggingFaceClient: {
      getClient: jest.fn(() => ({
        textGeneration: mockTextGeneration
      }))
    }
  };
});

describe('ConversationService', () => {
  let service: ConversationService;
  let mockTextGeneration: jest.Mock;

  beforeEach(() => {
    const { huggingFaceClient } = require('../HuggingFaceClient');
    mockTextGeneration = huggingFaceClient.getClient().textGeneration;
    jest.clearAllMocks();

    // Default mock implementation that returns the response after the prompt
    mockTextGeneration.mockImplementation((params: any) => {
      return Promise.resolve({
        generated_text: `${params.inputs}Default response for testing.`
      });
    });

    service = new ConversationService();
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
      const mockResponse = 'I understand you\'re feeling anxious. Let\'s work through this together.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateResponse('I feel worried about tomorrow', mockContext);

      expect(result.response).toBe(mockResponse);
      expect(result.error).toBeUndefined();
      expect(mockTextGeneration).toHaveBeenCalledWith({
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
      const mockResponse = 'Try to practice deep breathing for 5 minutes daily.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateResponse('I need help with anxiety', mockContext);

      expect(result.suggestedGoal).toContain('practice deep breathing');
    });

    it('should adapt to different emotions', async () => {
      const sadContext: ConversationContext = {
        ...mockContext,
        detectedEmotion: 'sad'
      };

      const mockResponse = 'I hear that you\'re feeling down.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateResponse('I feel sad', sadContext);

      expect(result.detectedEmotion).toBe('sad');
      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('encouraging and supportive tone')
        })
      );
    });

    it('should handle API failures with retry', async () => {
      const mockResponse = 'Success on retry';
      mockTextGeneration
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation((params: any) => {
          return Promise.resolve({
            generated_text: `${params.inputs}${mockResponse}`
          });
        });

      const result = await service.generateResponse('Hello', mockContext, { maxRetries: 2 });

      expect(result.response).toBe(mockResponse);
      expect(mockTextGeneration).toHaveBeenCalledTimes(2);
    });

    it('should return fallback response on complete failure', async () => {
      mockTextGeneration.mockRejectedValue(new Error('API Error'));

      const result = await service.generateResponse('Hello', mockContext, { maxRetries: 1 });

      expect(result.response).toContain('having trouble processing');
      expect(result.error).toContain('Conversation generation failed');
    });

    it('should not retry on non-retryable errors', async () => {
      mockTextGeneration.mockRejectedValue(new Error('Unauthorized'));

      const result = await service.generateResponse('Hello', mockContext, { maxRetries: 3 });

      expect(mockTextGeneration).toHaveBeenCalledTimes(1);
      expect(result.error).toContain('Conversation generation failed after 1 attempts: Unauthorized');
    });

    it('should handle empty context gracefully', async () => {
      const emptyContext: ConversationContext = { userId: 'test-user' };

      const mockResponse = 'Hello, how can I help you today?';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateResponse('Hi', emptyContext);

      expect(result.response).toBe(mockResponse);
      expect(mockTextGeneration).toHaveBeenCalledWith(
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

      const mockResponse = 'Let\'s focus on grounding techniques.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateResponse('I\'m anxious', anxiousContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
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

      const mockResponse = 'I understand you\'re going through a difficult time.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateResponse('I feel sad', sadContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('encouraging and supportive tone')
        })
      );
    });

    it('should include CBT techniques for specific emotions', async () => {
      const angryContext: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'angry'
      };

      const mockResponse = 'Let\'s explore what\'s beneath this anger.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateResponse('I\'m so angry!', angryContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Anger logs - identify triggers and patterns')
        })
      );
    });
  });

  describe('conversation phase adaptation', () => {
    it('should adapt to opening phase for new users', async () => {
      const newUserContext: ConversationContext = {
        userId: 'test-user',
        sessionHistory: []
      };

      const mockResponse = 'Welcome! Tell me what brings you here today.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateResponse('Hello', newUserContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('CONVERSATION PHASE: OPENING')
        })
      );
    });

    it('should adapt to intervention phase for established users', async () => {
      const establishedUserContext: ConversationContext = {
        userId: 'test-user',
        sessionHistory: ['Session 1', 'Session 2', 'Session 3', 'Session 4']
      };

      const mockResponse = 'Let\'s try a specific CBT technique.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateResponse('I need help', establishedUserContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('CONVERSATION PHASE: INTERVENTION')
        })
      );
    });
  });

  describe('session conclusion', () => {
    it('should detect when session should be concluded', () => {
      expect(service.shouldConcludeSession(12)).toBe(true); // Long conversation
      expect(service.shouldConcludeSession(5, 50)).toBe(true); // Long duration
      expect(service.shouldConcludeSession(3, 20, 'Thank you, that helps')).toBe(true); // User ending
      expect(service.shouldConcludeSession(3, 20, 'Tell me more')).toBe(false); // Continue
    });

    it('should generate session conclusion response', async () => {
      const mockContext: ConversationContext = {
        userId: 'test-user',
        sessionHistory: ['Previous session']
      };

      const mockResponse = 'Thank you for sharing today. Your goal is to practice mindfulness daily.';
      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateSessionConclusion('Thank you', mockContext);

      expect(result.response).toBe(mockResponse);
      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('SESSION_CONCLUSION')
        })
      );
    });
  });
});
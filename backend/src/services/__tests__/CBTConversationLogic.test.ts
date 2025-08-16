import { ConversationService } from '../ConversationService';
import { SentimentAnalysisService } from '../SentimentAnalysisService';
import type { ConversationContext } from '../ConversationService';

// Mock the HuggingFace client
jest.mock('../HuggingFaceClient', () => {
  const mockTextGeneration = jest.fn();
  const mockTextClassification = jest.fn();
  return {
    huggingFaceClient: {
      getClient: jest.fn(() => ({
        textGeneration: mockTextGeneration,
        textClassification: mockTextClassification
      }))
    }
  };
});

describe('CBT Conversation Logic Integration', () => {
  let conversationService: ConversationService;
  let sentimentService: SentimentAnalysisService;
  let mockTextGeneration: jest.Mock;
  let mockTextClassification: jest.Mock;

  beforeEach(() => {
    const { huggingFaceClient } = require('../HuggingFaceClient');
    const client = huggingFaceClient.getClient();
    mockTextGeneration = client.textGeneration;
    mockTextClassification = client.textClassification;
    
    jest.clearAllMocks();
    
    conversationService = new ConversationService();
    sentimentService = new SentimentAnalysisService();
  });

  describe('Emotion-Adaptive CBT Techniques', () => {
    it('should provide anxiety-specific CBT techniques in system prompt', async () => {
      const anxiousContext: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'anxious'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Let\'s practice grounding techniques.'
      });

      await conversationService.generateResponse('I feel anxious', anxiousContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Grounding techniques - 5-4-3-2-1 sensory method')
        })
      );
    });

    it('should provide sadness-specific CBT techniques in system prompt', async () => {
      const sadContext: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'sad'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Let\'s work on behavioral activation.'
      });

      await conversationService.generateResponse('I feel depressed', sadContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Behavioral activation - encourage small, meaningful activities')
        })
      );
    });

    it('should provide anger-specific CBT techniques in system prompt', async () => {
      const angryContext: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'angry'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Let\'s explore what\'s beneath this anger.'
      });

      await conversationService.generateResponse('I\'m so frustrated!', angryContext);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Anger logs - identify triggers, physical sensations, and thought patterns')
        })
      );
    });
  });

  describe('Contextual Goal Generation', () => {
    it('should generate anxiety-specific goals for opening phase', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'anxious',
        sessionHistory: []
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: I understand your anxiety.'
      });

      const result = await conversationService.generateResponse('I\'m worried about everything', context);

      expect(result.suggestedGoal).toBeDefined();
      expect(result.suggestedGoal).toMatch(/grounding|breath|anxious|thought/i);
    });

    it('should generate sadness-specific goals for exploration phase', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'sad',
        sessionHistory: ['Session 1', 'Session 2']
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: I hear that you\'re feeling down.'
      });

      const result = await conversationService.generateResponse('I feel hopeless', context);

      expect(result.suggestedGoal).toBeDefined();
      expect(result.suggestedGoal).toMatch(/negative thought|social activity|walk/i);
    });

    it('should extract and refine explicit goals from responses', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        detectedEmotion: 'anxious'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Try to practice deep breathing each day when you feel anxious.'
      });

      const result = await conversationService.generateResponse('What should I do?', context);

      expect(result.suggestedGoal).toBe('practice deep breathing each day when you feel anxious');
    });
  });

  describe('Sentiment Analysis Integration', () => {
    it('should provide comprehensive therapeutic recommendations', () => {
      const recommendations = sentimentService.getTherapeuticRecommendations('anxious', 0.8);

      expect(recommendations).toContain('Practice grounding techniques like 5-4-3-2-1 sensory awareness');
      expect(recommendations).toContain('Challenge catastrophic thinking with probability estimation');
      expect(recommendations).toContain('Provide immediate emotional validation and support');
    });

    it('should provide CBT interventions by category', () => {
      const interventions = sentimentService.getCBTInterventions('sad', 0.7);

      expect(interventions.cognitive).toContain('Identify and challenge negative automatic thoughts');
      expect(interventions.behavioral).toContain('Schedule pleasant activities daily');
      expect(interventions.physiological).toContain('Practice deep breathing exercises');
    });

    it('should adjust recommendations based on emotion intensity', () => {
      const highIntensityRecs = sentimentService.getTherapeuticRecommendations('anxious', 0.9);
      const lowIntensityRecs = sentimentService.getTherapeuticRecommendations('anxious', 0.3);

      expect(highIntensityRecs[0]).toContain('immediate emotional validation');
      expect(lowIntensityRecs).toContain('Build emotional awareness and vocabulary');
    });
  });

  describe('Conversation Phase Adaptation', () => {
    it('should adapt CBT approach for opening phase', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        sessionHistory: [],
        detectedEmotion: 'sad'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Welcome, tell me what brings you here.'
      });

      await conversationService.generateResponse('Hello', context);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('building rapport, understanding the user\'s concerns')
        })
      );
    });

    it('should adapt CBT approach for intervention phase', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        sessionHistory: ['Session 1', 'Session 2', 'Session 3', 'Session 4'],
        detectedEmotion: 'anxious'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Let\'s try a specific CBT technique.'
      });

      await conversationService.generateResponse('I need help', context);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Apply specific CBT techniques')
        })
      );
    });
  });

  describe('Session Conclusion Logic', () => {
    it('should detect when session should conclude based on conversation length', () => {
      expect(conversationService.shouldConcludeSession(12)).toBe(true);
      expect(conversationService.shouldConcludeSession(5)).toBe(false);
    });

    it('should detect when session should conclude based on user indicators', () => {
      expect(conversationService.shouldConcludeSession(5, 20, 'Thank you, that helps')).toBe(true);
      expect(conversationService.shouldConcludeSession(5, 20, 'I feel better now')).toBe(true);
      expect(conversationService.shouldConcludeSession(5, 20, 'Tell me more')).toBe(false);
    });

    it('should generate appropriate session conclusion with goal', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        sessionHistory: ['Previous session'],
        detectedEmotion: 'anxious'
      };

      mockTextGeneration.mockResolvedValue({
        generated_text: 'Test prompt response: Thank you for sharing. Your goal is to practice mindfulness daily.'
      });

      const result = await conversationService.generateSessionConclusion('Thank you', context);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('SESSION_CONCLUSION')
        })
      );
      expect(result.response).toBeDefined();
    });
  });
});
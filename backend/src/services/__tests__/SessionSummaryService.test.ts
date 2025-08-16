import { SessionSummaryService } from '../SessionSummaryService';

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

describe('SessionSummaryService', () => {
  let service: SessionSummaryService;
  let mockTextGeneration: jest.Mock;

  beforeEach(() => {
    const { huggingFaceClient } = require('../HuggingFaceClient');
    mockTextGeneration = huggingFaceClient.getClient().textGeneration;
    jest.clearAllMocks();
    
    // Default mock implementation that returns the response after the prompt
    mockTextGeneration.mockImplementation((params: any) => {
      return Promise.resolve({
        generated_text: `${params.inputs}Default summary for testing.`
      });
    });
    
    service = new SessionSummaryService();
  });

  describe('generateSummary', () => {
    const mockTranscript = `
      User: I've been feeling really anxious about work lately.
      Numa: I understand that work anxiety can be overwhelming. Can you tell me what specific aspects of work are causing you the most stress?
      User: It's the deadlines and the fear of making mistakes.
      Numa: Those are common concerns. Let's work on identifying the thoughts behind these fears. What goes through your mind when you think about these deadlines?
    `;

    it('should generate structured session summary', async () => {
      const mockResponse = `SUMMARY: User discussed work-related anxiety focusing on deadlines and fear of mistakes. Applied CBT techniques to identify underlying thought patterns.
KEY_INSIGHTS: Fear of failure, perfectionist tendencies
EMOTIONAL_STATE: Anxious but engaged in therapeutic process
PROGRESS_NOTES: Good awareness of anxiety triggers, ready for cognitive restructuring`;

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateSummary(mockTranscript, 'anxious', 30);

      expect(result.summary).toContain('work-related anxiety');
      expect(result.keyInsights).toEqual(['Fear of failure', 'perfectionist tendencies']);
      expect(result.emotionalState).toBe('Anxious but engaged in therapeutic process');
      expect(result.progressNotes).toContain('cognitive restructuring');
      expect(result.error).toBeUndefined();
    });

    it('should handle unstructured response format', async () => {
      const mockResponse = 'The user discussed anxiety about work deadlines and showed good engagement with CBT techniques.';

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateSummary(mockTranscript, 'anxious');

      expect(result.summary).toBe(mockResponse);
      expect(result.keyInsights).toEqual([]);
      expect(result.error).toBeUndefined();
    });

    it('should handle empty transcript', async () => {
      const result = await service.generateSummary('');

      expect(result.summary).toBe('No session content to summarize.');
      expect(result.error).toBe('Empty transcript provided');
      expect(mockTextGeneration).not.toHaveBeenCalled();
    });

    it('should truncate long transcripts', async () => {
      const longTranscript = 'A'.repeat(3000);
      const mockResponse = 'SUMMARY: Long session summary';

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateSummary(longTranscript);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('...') as string
        })
      );
    });

    it('should include session context in prompt', async () => {
      const mockResponse = 'SUMMARY: Session with context';

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateSummary(mockTranscript, 'sad', 45);

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('primary emotion was: sad') as string
        })
      );

      expect(mockTextGeneration).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.stringContaining('Session duration: 45 minutes') as string
        })
      );
    });

    it('should handle API failures with retry', async () => {
      const mockResponse = 'SUMMARY: Success on retry';

      mockTextGeneration
        .mockRejectedValueOnce(new Error('Network error'))
        .mockImplementation((params: any) => {
          return Promise.resolve({
            generated_text: `${params.inputs}${mockResponse}`
          });
        });

      const result = await service.generateSummary(mockTranscript, 'neutral', undefined, { maxRetries: 2 });

      expect(result.summary).toContain('Success on retry');
      expect(mockTextGeneration).toHaveBeenCalledTimes(2);
    });

    it('should return fallback summary on complete failure', async () => {
      mockTextGeneration.mockRejectedValue(new Error('API Error'));

      const result = await service.generateSummary(mockTranscript, 'neutral', undefined, { maxRetries: 1 });

      expect(result.summary).toBe('Unable to generate session summary at this time.');
      expect(result.error).toContain('Session summary generation failed');
    });

    it('should not retry on non-retryable errors', async () => {
      mockTextGeneration.mockRejectedValue(new Error('Unauthorized'));

      const result = await service.generateSummary(mockTranscript, 'neutral', undefined, { maxRetries: 3 });

      expect(mockTextGeneration).toHaveBeenCalledTimes(1);
      expect(result.error).toContain('Session summary generation failed after 1 attempts: Unauthorized');
    });

    it('should use appropriate parameters for summary generation', async () => {
      const mockResponse = 'SUMMARY: Test summary';

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      await service.generateSummary(mockTranscript, 'happy', 30, {
        maxTokens: 250,
        temperature: 0.5
      });

      expect(mockTextGeneration).toHaveBeenCalledWith({
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        inputs: expect.any(String) as string,
        parameters: {
          max_new_tokens: 250,
          temperature: 0.5,
          do_sample: true,
          top_p: 0.9,
          repetition_penalty: 1.1,
          stop: ['<|eot_id|>', '\n\nTranscript:', '\n\nUser:']
        }
      });
    });
  });

  describe('generateContextSummary', () => {
    const mockTranscript = `
      User: I had a panic attack yesterday.
      Numa: I'm sorry to hear that. Can you tell me what was happening when it started?
      User: I was in a meeting and suddenly felt overwhelmed.
      Numa: That sounds frightening. Let's explore what thoughts you were having during that moment.
    `;

    it('should generate brief context summary', async () => {
      const mockResponse = 'SUMMARY: User experienced panic attack in meeting. Explored triggers and thoughts during episode. Applied grounding techniques.';

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateContextSummary(mockTranscript, 'anxious');

      expect(result).toBe('User experienced panic attack in meeting.');
      expect(result.length).toBeLessThanOrEqual(100);
    });

    it('should truncate long context summaries', async () => {
      const longSummary = 'A'.repeat(150);
      const mockResponse = `SUMMARY: ${longSummary}`;

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateContextSummary(mockTranscript, 'sad');

      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).toMatch(/\.\.\.$/);
    });

    it('should return fallback context on API failure', async () => {
      mockTextGeneration.mockRejectedValue(new Error('API Error'));

      const result = await service.generateContextSummary(mockTranscript, 'angry');

      expect(result).toBe('Session with angry emotions - therapeutic discussion occurred.');
    });

    it('should handle missing emotion in fallback', async () => {
      mockTextGeneration.mockRejectedValue(new Error('API Error'));

      const result = await service.generateContextSummary(mockTranscript);

      expect(result).toBe('Session with mixed emotions - therapeutic discussion occurred.');
    });
  });

  describe('response parsing', () => {
    it('should parse all structured sections', async () => {
      const mockResponse = `SUMMARY: Comprehensive session about anxiety management
KEY_INSIGHTS: Catastrophic thinking patterns, avoidance behaviors, progress in mindfulness
EMOTIONAL_STATE: Initially anxious, more calm by session end
PROGRESS_NOTES: Ready for homework assignments, showing good insight`;

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateSummary('test transcript', 'anxious');

      expect(result.summary).toBe('Comprehensive session about anxiety management');
      expect(result.keyInsights).toEqual([
        'Catastrophic thinking patterns',
        'avoidance behaviors',
        'progress in mindfulness'
      ]);
      expect(result.emotionalState).toBe('Initially anxious, more calm by session end');
      expect(result.progressNotes).toBe('Ready for homework assignments, showing good insight');
    });

    it('should handle partial structured format', async () => {
      const mockResponse = `SUMMARY: Session focused on depression symptoms
EMOTIONAL_STATE: Depressed but hopeful`;

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateSummary('test transcript', 'sad');

      expect(result.summary).toBe('Session focused on depression symptoms');
      expect(result.keyInsights).toEqual([]);
      expect(result.emotionalState).toBe('Depressed but hopeful');
      expect(result.progressNotes).toBe('');
    });

    it('should provide default summary when parsing fails', async () => {
      const mockResponse = '';

      mockTextGeneration.mockImplementation((params: any) => {
        return Promise.resolve({
          generated_text: `${params.inputs}${mockResponse}`
        });
      });

      const result = await service.generateSummary('test transcript');

      expect(result.summary).toBe('Session completed with therapeutic discussion.');
    });
  });
});
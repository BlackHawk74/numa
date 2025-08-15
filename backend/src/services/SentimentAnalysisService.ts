import { HfInference } from '@huggingface/inference';
import { huggingFaceClient } from './HuggingFaceClient';

export interface SentimentResult {
  emotion: string;
  confidence: number;
  rawScores?: Array<{ label: string; score: number }>;
  error?: string;
}

export interface SentimentOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Sentiment analysis service for detecting user emotions
 */
export class SentimentAnalysisService {
  private client: HfInference;
  private readonly MODEL_NAME = 'j-hartmann/emotion-english-distilroberta-base';
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  constructor() {
    this.client = huggingFaceClient.getClient();
  }

  /**
   * Analyze sentiment/emotion from user text
   */
  async analyzeSentiment(
    text: string,
    options: SentimentOptions = {}
  ): Promise<SentimentResult> {
    const {
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    if (!text || text.trim().length === 0) {
      return {
        emotion: 'neutral',
        confidence: 0,
        error: 'Text input is required'
      };
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Sentiment analysis attempt ${attempt}/${maxRetries} using model: ${this.MODEL_NAME}`);

        const result = await this.client.textClassification({
          model: this.MODEL_NAME,
          inputs: text.substring(0, 512) // Limit text length
        });

        if (result && Array.isArray(result) && result.length > 0) {
          // Sort by confidence and get the top emotion
          const sortedResults = result.sort((a, b) => b.score - a.score);
          const topEmotion = sortedResults[0];

          return {
            emotion: this.normalizeEmotion(topEmotion.label),
            confidence: topEmotion.score,
            rawScores: sortedResults.map(r => ({ label: r.label, score: r.score }))
          };
        } else {
          throw new Error('No sentiment analysis result received');
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`Sentiment analysis attempt ${attempt} failed:`, error);

        if (this.isNonRetryableError(error)) {
          break;
        }

        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt);
        }
      }
    }

    // Return neutral emotion as fallback
    return {
      emotion: 'neutral',
      confidence: 0,
      error: `Sentiment analysis failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Normalize emotion labels to consistent format
   */
  private normalizeEmotion(emotion: string): string {
    const emotionMap: { [key: string]: string } = {
      'joy': 'happy',
      'happiness': 'happy',
      'sadness': 'sad',
      'anger': 'angry',
      'fear': 'anxious',
      'anxiety': 'anxious',
      'surprise': 'surprised',
      'disgust': 'disgusted',
      'neutral': 'neutral'
    };

    const normalizedEmotion = emotion.toLowerCase();
    return emotionMap[normalizedEmotion] || normalizedEmotion;
  }

  /**
   * Get emotion intensity level
   */
  getEmotionIntensity(confidence: number): 'low' | 'medium' | 'high' {
    if (confidence < 0.4) return 'low';
    if (confidence < 0.7) return 'medium';
    return 'high';
  }

  /**
   * Check if emotion indicates distress
   */
  isDistressedEmotion(emotion: string): boolean {
    const distressedEmotions = ['sad', 'angry', 'anxious', 'fear', 'disgusted'];
    return distressedEmotions.includes(emotion.toLowerCase());
  }

  /**
   * Get therapeutic recommendations based on emotion
   */
  getTherapeuticRecommendations(emotion: string, confidence: number): string[] {
    const recommendations: { [key: string]: string[] } = {
      'sad': [
        'Focus on identifying negative thought patterns',
        'Encourage behavioral activation',
        'Explore underlying beliefs'
      ],
      'anxious': [
        'Practice grounding techniques',
        'Challenge catastrophic thinking',
        'Use breathing exercises'
      ],
      'angry': [
        'Identify triggers and warning signs',
        'Practice anger management techniques',
        'Explore underlying hurt or frustration'
      ],
      'happy': [
        'Reinforce positive thoughts and behaviors',
        'Build on current strengths',
        'Set positive goals'
      ]
    };

    const intensity = this.getEmotionIntensity(confidence);
    const baseRecommendations = recommendations[emotion.toLowerCase()] || ['Provide general CBT support'];

    if (intensity === 'high' && this.isDistressedEmotion(emotion)) {
      baseRecommendations.unshift('Provide immediate emotional support');
    }

    return baseRecommendations;
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    return (
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('quota') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('invalid api key')
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const sentimentAnalysisService = new SentimentAnalysisService();
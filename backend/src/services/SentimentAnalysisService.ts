import { InferenceClient } from '@huggingface/inference';
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
  private client: InferenceClient;
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

        // Use enhanced HuggingFace client with caching and monitoring
        const result = await huggingFaceClient.textClassification({
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
   * Get comprehensive therapeutic recommendations based on emotion and intensity
   */
  getTherapeuticRecommendations(emotion: string, confidence: number): string[] {
    const recommendations: { [key: string]: string[] } = {
      'sad': [
        'Focus on identifying negative thought patterns and cognitive distortions',
        'Encourage behavioral activation through small, achievable activities',
        'Explore underlying beliefs about self-worth and capability',
        'Use thought challenging techniques to examine evidence for negative thoughts',
        'Implement mood monitoring to track patterns and triggers'
      ],
      'anxious': [
        'Practice grounding techniques like 5-4-3-2-1 sensory awareness',
        'Challenge catastrophic thinking with probability estimation',
        'Use breathing exercises and progressive muscle relaxation',
        'Implement worry time to contain anxious thoughts',
        'Develop coping statements for anxiety-provoking situations'
      ],
      'angry': [
        'Identify triggers, warning signs, and physical sensations of anger',
        'Practice anger management techniques including time-outs',
        'Explore underlying hurt, fear, or unmet needs beneath anger',
        'Use cognitive restructuring to challenge angry interpretations',
        'Develop assertiveness skills for healthy expression of needs'
      ],
      'happy': [
        'Reinforce positive thoughts and behaviors through gratitude practices',
        'Build on current strengths and successful coping strategies',
        'Set positive, meaningful goals that align with values',
        'Practice savoring techniques to enhance positive experiences',
        'Use positive emotions to build resilience for future challenges'
      ],
      'fear': [
        'Gradually expose to feared situations using systematic desensitization',
        'Challenge safety behaviors and avoidance patterns',
        'Practice realistic risk assessment and probability thinking',
        'Develop personalized coping statements for fearful moments',
        'Use relaxation techniques to manage physical fear responses'
      ],
      'disgusted': [
        'Explore values conflicts that may be triggering disgust',
        'Practice acceptance and tolerance of uncomfortable emotions',
        'Use cognitive defusion to observe thoughts without judgment',
        'Implement behavioral experiments to test disgust-related assumptions',
        'Develop mindful exposure strategies to increase emotional tolerance'
      ],
      'surprised': [
        'Process unexpected events and their emotional impact',
        'Explore assumptions that were challenged by surprising information',
        'Practice flexibility and adaptability in thinking patterns',
        'Use surprise as an opportunity for learning and growth',
        'Develop coping strategies for uncertainty and change'
      ]
    };

    const intensity = this.getEmotionIntensity(confidence);
    const baseRecommendations = recommendations[emotion.toLowerCase()] || [
      'Provide general CBT support through thought monitoring',
      'Encourage mindfulness and present-moment awareness',
      'Explore the connection between thoughts, feelings, and behaviors'
    ];

    // Add intensity-specific recommendations
    if (intensity === 'high' && this.isDistressedEmotion(emotion)) {
      baseRecommendations.unshift(
        'Provide immediate emotional validation and support',
        'Ensure safety and stability before proceeding with interventions'
      );
    } else if (intensity === 'low') {
      baseRecommendations.push(
        'Explore subtle emotional patterns that may be overlooked',
        'Build emotional awareness and vocabulary'
      );
    }

    return baseRecommendations;
  }

  /**
   * Get emotion-specific CBT intervention strategies
   */
  getCBTInterventions(emotion: string, confidence: number): {
    cognitive: string[];
    behavioral: string[];
    physiological: string[];
  } {
    const interventions: { [key: string]: { cognitive: string[]; behavioral: string[]; physiological: string[] } } = {
      'sad': {
        cognitive: [
          'Identify and challenge negative automatic thoughts',
          'Examine evidence for and against depressive thoughts',
          'Practice cognitive restructuring with balanced thinking'
        ],
        behavioral: [
          'Schedule pleasant activities daily',
          'Increase social connections and support',
          'Establish regular sleep and exercise routines'
        ],
        physiological: [
          'Practice deep breathing exercises',
          'Engage in physical activity to boost mood',
          'Maintain proper nutrition and hydration'
        ]
      },
      'anxious': {
        cognitive: [
          'Challenge catastrophic thinking patterns',
          'Practice probability estimation for feared outcomes',
          'Develop realistic coping statements'
        ],
        behavioral: [
          'Gradually face feared situations through exposure',
          'Reduce avoidance and safety behaviors',
          'Practice relaxation and grounding techniques'
        ],
        physiological: [
          'Use controlled breathing techniques',
          'Practice progressive muscle relaxation',
          'Engage in regular physical exercise'
        ]
      },
      'angry': {
        cognitive: [
          'Identify and challenge angry thoughts and assumptions',
          'Practice perspective-taking and empathy',
          'Develop alternative interpretations of situations'
        ],
        behavioral: [
          'Use time-out strategies when anger escalates',
          'Practice assertive communication skills',
          'Engage in physical outlets for anger energy'
        ],
        physiological: [
          'Practice deep breathing to reduce physical tension',
          'Use progressive muscle relaxation',
          'Engage in vigorous exercise to release anger energy'
        ]
      }
    };

    return interventions[emotion.toLowerCase()] || {
      cognitive: ['Practice mindful observation of thoughts'],
      behavioral: ['Engage in values-based activities'],
      physiological: ['Use basic relaxation techniques']
    };
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
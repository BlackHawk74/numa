import { HfInference } from '@huggingface/inference';
import { huggingFaceClient } from './HuggingFaceClient';

export interface ConversationContext {
  userId: string;
  sessionHistory?: string[];
  activeGoals?: string[];
  detectedEmotion?: string;
  userName?: string;
}

export interface ConversationResult {
  response: string;
  suggestedGoal?: string;
  detectedEmotion?: string;
  error?: string;
}

export interface ConversationOptions {
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * CBT-based conversation service using Llama 3.1 8B Instruct
 */
export class ConversationService {
  private client: HfInference;
  private readonly MODEL_NAME = 'meta-llama/Llama-3.1-8B-Instruct';
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  constructor() {
    this.client = huggingFaceClient.getClient();
  }

  /**
   * Generate therapeutic response using CBT techniques
   */
  async generateResponse(
    userMessage: string,
    context: ConversationContext,
    options: ConversationOptions = {}
  ): Promise<ConversationResult> {
    const {
      maxTokens = 150,
      temperature = 0.7,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Conversation attempt ${attempt}/${maxRetries} using model: ${this.MODEL_NAME}`);

        const systemPrompt = this.buildSystemPrompt(context);
        const fullPrompt = this.formatPrompt(systemPrompt, userMessage, context);

        const result = await this.client.textGeneration({
          model: this.MODEL_NAME,
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1,
            stop: ['<|eot_id|>', '\n\nUser:', '\n\nHuman:']
          }
        });

        if (result && result.generated_text) {
          const response = this.extractResponse(result.generated_text, fullPrompt);
          const suggestedGoal = this.extractGoal(response);
          
          return {
            response: response.trim(),
            suggestedGoal,
            detectedEmotion: context.detectedEmotion
          };
        } else {
          throw new Error('No response generated');
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`Conversation attempt ${attempt} failed:`, error);

        if (this.isNonRetryableError(error)) {
          break;
        }

        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt);
        }
      }
    }

    return {
      response: "I'm having trouble processing your message right now. Could you please try again?",
      error: `Conversation generation failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Build CBT-focused system prompt
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const emotionGuidance = this.getEmotionGuidance(context.detectedEmotion);
    const sessionContext = context.sessionHistory?.slice(-3).join('\n') || 'This is a new session.';
    const goalsContext = context.activeGoals?.join(', ') || 'No active goals yet.';

    return `You are Numa, a compassionate CBT-based therapist. Your responses should:

1. Be empathetic and supportive
2. Guide users through CBT techniques:
   - Help identify negative thoughts and cognitive distortions
   - Challenge unhelpful thinking patterns
   - Develop positive alternative thoughts
   - Provide practical coping strategies
3. Keep responses under 3 sentences and conversational
4. End sessions with small, actionable goals when appropriate
5. Adapt your tone based on the user's emotional state

${emotionGuidance}

Recent session context: ${sessionContext}
Current goals: ${goalsContext}

Remember to be warm, professional, and focused on CBT principles. Ask open-ended questions to help the user explore their thoughts and feelings.`;
  }

  /**
   * Get emotion-specific guidance for therapeutic approach
   */
  private getEmotionGuidance(emotion?: string): string {
    switch (emotion?.toLowerCase()) {
      case 'sad':
      case 'depressed':
        return 'The user appears sad. Use an encouraging and supportive tone. Focus on identifying negative thought patterns and building hope.';
      case 'anxious':
      case 'worried':
        return 'The user appears anxious. Use a calm and grounding tone. Focus on breathing techniques and challenging catastrophic thinking.';
      case 'angry':
      case 'frustrated':
        return 'The user appears frustrated. Use a patient and understanding tone. Help them identify triggers and develop healthy coping strategies.';
      case 'happy':
      case 'positive':
        return 'The user appears positive. Acknowledge their good mood and help them build on positive thoughts and behaviors.';
      default:
        return 'Maintain a neutral, supportive tone and adapt based on the conversation flow.';
    }
  }

  /**
   * Format the complete prompt for Llama
   */
  private formatPrompt(systemPrompt: string, userMessage: string, context: ConversationContext): string {
    const userName = context.userName || 'User';
    
    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>

${userMessage}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;
  }

  /**
   * Extract the response from the generated text
   */
  private extractResponse(generatedText: string, originalPrompt: string): string {
    // Remove the original prompt from the response
    let response = generatedText.replace(originalPrompt, '').trim();
    
    // Remove any remaining special tokens
    response = response.replace(/<\|[^|]+\|>/g, '').trim();
    
    // Split by common conversation markers and take the first part
    const markers = ['\n\nUser:', '\n\nHuman:', '\n\n---'];
    for (const marker of markers) {
      const parts = response.split(marker);
      if (parts.length > 1) {
        response = parts[0].trim();
        break;
      }
    }

    // If response is still empty or just the original prompt, return the full generated text
    if (!response || response === originalPrompt) {
      response = generatedText.trim();
    }

    return response;
  }

  /**
   * Extract potential goals from the response
   */
  private extractGoal(response: string): string | undefined {
    // Look for goal-indicating phrases
    const goalPatterns = [
      /try to (.+?)(?:\.|$)/i,
      /goal.*?(?:is|would be) to (.+?)(?:\.|$)/i,
      /practice (.+?)(?:\.|$)/i,
      /work on (.+?)(?:\.|$)/i
    ];

    for (const pattern of goalPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        const goal = match[1].trim();
        if (goal.length > 10 && goal.length < 100) {
          return goal;
        }
      }
    }

    return undefined;
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
export const conversationService = new ConversationService();
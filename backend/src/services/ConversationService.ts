import { InferenceClient } from '@huggingface/inference';
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
  private client: InferenceClient;
  // Prefer a free, chat-capable model available on HF serverless
  private readonly MODEL_NAME = 'google/gemma-2-2b-it';
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
    let actualAttempts = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      actualAttempts = attempt;
      try {
        console.log(`Conversation attempt ${attempt}/${maxRetries} using model: ${this.MODEL_NAME}`);

        const systemPrompt = this.buildSystemPrompt(context);
        // Prefer chatCompletion with a chat-capable model
        const chatResp = await huggingFaceClient.chatCompletion({
          model: this.MODEL_NAME,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ],
          max_tokens: maxTokens,
          temperature
        });

        // Extract assistant content from chat response
        let extractedResponse = '';
        if (chatResp?.choices?.[0]?.message?.content) {
          extractedResponse = chatResp.choices[0].message.content.trim();
        } else if (typeof chatResp === 'string') {
          extractedResponse = chatResp.trim();
        } else if (chatResp?.generated_text) {
          extractedResponse = chatResp.generated_text.trim();
        } else {
          // Fallback: stringify unknown response
          console.warn('Unexpected chat response format:', chatResp);
          extractedResponse = JSON.stringify(chatResp);
        }

        const suggestedGoal = this.extractGoal(extractedResponse, context);
        
        return {
          response: extractedResponse,
          suggestedGoal,
          detectedEmotion: context.detectedEmotion
        };

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
      error: `Conversation generation failed after ${actualAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Build CBT-focused system prompt
   */
  private buildSystemPrompt(context: ConversationContext): string {
    const emotionGuidance = this.getEmotionGuidance(context.detectedEmotion);
    const conversationPhase = this.getConversationPhase(context.sessionHistory);
    const phaseGuidance = this.getPhaseGuidance(conversationPhase);
    const cbtTechniques = this.getCBTTechniques(context.detectedEmotion);
    const sessionContext = context.sessionHistory?.slice(-6).join('\n') || 'This is a new session.';
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

EMOTIONAL GUIDANCE: ${emotionGuidance}

CONVERSATION PHASE: ${conversationPhase.toUpperCase()}
${phaseGuidance}

RECOMMENDED CBT TECHNIQUES for this emotional state:
${cbtTechniques.map(technique => `- ${technique}`).join('\n')}

Recent session context: ${sessionContext}
Current goals: ${goalsContext}

Remember to be warm, professional, and focused on CBT principles. Ask open-ended questions to help the user explore their thoughts and feelings. Adapt your therapeutic approach based on the conversation phase and emotional state.`;
  }

  /**
   * Get emotion-specific guidance for therapeutic approach
   */
  private getEmotionGuidance(emotion?: string): string {
    switch (emotion?.toLowerCase()) {
      case 'sad':
      case 'depressed':
        return 'The user appears sad. Use an encouraging and supportive tone. Focus on identifying negative thought patterns and building hope. Ask about their support system and recent positive experiences.';
      case 'anxious':
      case 'worried':
        return 'The user appears anxious. Use a calm and grounding tone. Focus on breathing techniques and challenging catastrophic thinking. Help them distinguish between realistic and unrealistic worries.';
      case 'angry':
      case 'frustrated':
        return 'The user appears frustrated. Use a patient and understanding tone. Help them identify triggers and develop healthy coping strategies. Explore what\'s beneath the anger (hurt, fear, disappointment).';
      case 'happy':
      case 'positive':
        return 'The user appears positive. Acknowledge their good mood and help them build on positive thoughts and behaviors. Explore what contributed to this positive state.';
      case 'fear':
        return 'The user appears fearful. Use a reassuring and grounding tone. Help them assess the reality of their fears and develop coping strategies. Focus on what they can control.';
      case 'surprised':
        return 'The user seems surprised or uncertain. Use a curious and exploratory tone. Help them process unexpected events or realizations.';
      case 'disgusted':
        return 'The user appears disgusted or repulsed. Use a non-judgmental tone. Explore what triggered this feeling and help them process it constructively.';
      default:
        return 'Maintain a neutral, supportive tone and adapt based on the conversation flow. Pay attention to emotional cues and respond empathetically.';
    }
  }

  /**
   * Determine conversation phase and adjust approach accordingly
   */
  private getConversationPhase(sessionHistory?: string[]): 'opening' | 'exploration' | 'intervention' | 'closure' {
    if (!sessionHistory || sessionHistory.length === 0) {
      return 'opening';
    }
    
    const sessionCount = sessionHistory.length;
    if (sessionCount <= 2) return 'exploration';
    if (sessionCount <= 5) return 'intervention';
    return 'closure';
  }

  /**
   * Get phase-specific therapeutic guidance
   */
  private getPhaseGuidance(phase: 'opening' | 'exploration' | 'intervention' | 'closure'): string {
    switch (phase) {
      case 'opening':
        return 'This is an early session. Focus on building rapport, understanding the user\'s concerns, and establishing therapeutic goals.';
      case 'exploration':
        return 'Continue exploring the user\'s thoughts, feelings, and patterns. Help them gain insight into their cognitive and behavioral patterns.';
      case 'intervention':
        return 'Apply specific CBT techniques. Challenge cognitive distortions, suggest behavioral experiments, and provide coping strategies.';
      case 'closure':
        return 'Focus on consolidating progress, reinforcing learned skills, and preparing for independent application of CBT techniques.';
    }
  }

  /**
   * Generate emotion-adaptive CBT techniques with detailed interventions
   */
  private getCBTTechniques(emotion?: string): string[] {
    const techniques: { [key: string]: string[] } = {
      'sad': [
        'Behavioral activation - encourage small, meaningful activities like taking a walk or calling a friend',
        'Thought challenging - identify and question negative self-talk using the "evidence for/against" technique',
        'Gratitude exercises - focus on three positive aspects of life daily',
        'Activity scheduling - plan pleasant activities to combat withdrawal',
        'Cognitive restructuring - replace "all-or-nothing" thinking with balanced perspectives'
      ],
      'anxious': [
        'Grounding techniques - 5-4-3-2-1 sensory method (5 things you see, 4 you hear, etc.)',
        'Catastrophic thinking challenges - examine worst-case scenarios and their realistic probability',
        'Progressive muscle relaxation - systematically tense and release muscle groups',
        'Breathing exercises - practice 4-7-8 breathing technique',
        'Worry time - schedule 15 minutes daily for worrying, then redirect anxious thoughts'
      ],
      'angry': [
        'Anger logs - identify triggers, physical sensations, and thought patterns',
        'Cognitive restructuring - challenge angry thoughts with "Is this helpful?" questions',
        'Assertiveness training - express needs using "I" statements appropriately',
        'Time-out techniques - recognize early warning signs and take breaks',
        'Perspective-taking - consider alternative explanations for others\' behavior'
      ],
      'happy': [
        'Positive psychology techniques - savor good moments through mindful appreciation',
        'Strength identification - build on what\'s working and apply strengths to challenges',
        'Goal setting - channel positive energy into meaningful, achievable objectives',
        'Gratitude journaling - document positive experiences to build resilience',
        'Social connection - share positive experiences with supportive people'
      ],
      'fear': [
        'Exposure therapy principles - gradually face fears in manageable steps',
        'Safety behaviors identification - recognize and reduce avoidance patterns',
        'Realistic risk assessment - evaluate actual vs. perceived danger',
        'Coping statements - develop personalized phrases for fearful moments',
        'Relaxation techniques - use deep breathing and muscle relaxation when afraid'
      ],
      'disgusted': [
        'Values clarification - identify what conflicts with your core values',
        'Acceptance strategies - practice tolerating uncomfortable emotions',
        'Cognitive defusion - observe thoughts without being controlled by them',
        'Behavioral experiments - test assumptions about disgusting situations',
        'Mindful exposure - gradually increase tolerance through mindfulness'
      ]
    };

    return techniques[emotion?.toLowerCase() || 'neutral'] || [
      'Mindfulness exercises - stay present and aware through body scan meditation',
      'Thought records - track thoughts, feelings, and behaviors using CBT worksheets',
      'Problem-solving techniques - break down challenges into manageable steps',
      'Self-compassion practices - treat yourself with kindness during difficult times',
      'Behavioral experiments - test negative predictions through real-world actions'
    ];
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
   * Extract and generate therapeutic goals from the response and context
   */
  private extractGoal(response: string, context?: ConversationContext): string | undefined {
    // Look for explicit goal-indicating phrases in the response
    const goalPatterns = [
      /try to (.+?)(?:\.|$)/i,
      /goal.*?(?:is|would be) to (.+?)(?:\.|$)/i,
      /practice (.+?)(?:\.|$)/i,
      /work on (.+?)(?:\.|$)/i,
      /focus on (.+?)(?:\.|$)/i,
      /commit to (.+?)(?:\.|$)/i,
      /challenge yourself to (.+?)(?:\.|$)/i
    ];

    for (const pattern of goalPatterns) {
      const match = response.match(pattern);
      if (match && match[1]) {
        const goal = match[1].trim();
        if (goal.length > 10 && goal.length < 100) {
          return this.refineGoal(goal, context?.detectedEmotion);
        }
      }
    }

    // If no explicit goal found, generate one based on emotion and conversation phase
    if (context) {
      return this.generateContextualGoal(context);
    }

    return undefined;
  }

  /**
   * Refine extracted goals to be more specific and actionable
   */
  private refineGoal(goal: string, emotion?: string): string {
    // Remove common filler words and make more specific
    let refinedGoal = goal
      .replace(/^(to\s+)?/, '')
      .replace(/\s+each day$/, ' daily')
      .replace(/\s+every day$/, ' daily')
      .trim();

    // Add emotion-specific refinements only if not already present
    if (emotion) {
      const emotionRefinements: { [key: string]: (goal: string) => string } = {
        'anxious': (g) => {
          if (g.includes('breathing') && !g.includes('when feeling anxious')) {
            return g.replace(/daily$/, 'for 5 minutes when feeling anxious');
          }
          return g;
        },
        'sad': (g) => {
          if (g.includes('activity') && !g.includes('motivation')) {
            return `${g} even when motivation is low`;
          }
          return g;
        },
        'angry': (g) => {
          if ((g.includes('pause') || g.includes('time')) && !g.includes('before reacting')) {
            return `${g} before reacting`;
          }
          return g;
        }
      };

      const refinement = emotionRefinements[emotion.toLowerCase()];
      if (refinement) {
        refinedGoal = refinement(refinedGoal);
      }
    }

    return refinedGoal;
  }

  /**
   * Generate contextual goals based on conversation context
   */
  private generateContextualGoal(context: ConversationContext): string | undefined {
    const emotion = context.detectedEmotion?.toLowerCase();
    const phase = this.getConversationPhase(context.sessionHistory);

    const goalTemplates: { [key: string]: { [key: string]: string[] } } = {
      'anxious': {
        'opening': [
          'Practice the 5-4-3-2-1 grounding technique once daily',
          'Notice and write down one anxious thought each day',
          'Take three deep breaths before checking phone or email'
        ],
        'exploration': [
          'Challenge one catastrophic thought with evidence this week',
          'Practice saying "I notice I\'m having the thought that..." before anxious thoughts',
          'Spend 10 minutes daily doing a calming activity'
        ],
        'intervention': [
          'Use the worry time technique for 15 minutes daily',
          'Practice progressive muscle relaxation before bed',
          'Face one small feared situation this week'
        ],
        'closure': [
          'Continue using your most helpful anxiety management technique daily',
          'Apply learned coping skills to new anxiety-provoking situations',
          'Share your progress with a trusted friend or family member'
        ]
      },
      'sad': {
        'opening': [
          'Do one small pleasant activity each day, even if you don\'t feel like it',
          'Write down one thing you\'re grateful for daily',
          'Reach out to one person you care about this week'
        ],
        'exploration': [
          'Notice and question one negative thought about yourself daily',
          'Schedule one social activity this week',
          'Take a 10-minute walk outside each day'
        ],
        'intervention': [
          'Use the thought record technique when feeling very down',
          'Engage in behavioral activation by planning three pleasant activities weekly',
          'Practice self-compassion by speaking to yourself as you would a good friend'
        ],
        'closure': [
          'Maintain your activity schedule even when motivation is low',
          'Continue challenging negative self-talk using learned techniques',
          'Build on the positive changes you\'ve made'
        ]
      },
      'angry': {
        'opening': [
          'Take a 10-second pause before responding when feeling angry',
          'Notice physical signs of anger (tension, heat) once daily',
          'Practice one deep breathing exercise when frustrated'
        ],
        'exploration': [
          'Keep an anger log noting triggers and thoughts for one week',
          'Practice the time-out technique when anger reaches 7/10 intensity',
          'Use "I feel" statements instead of "You" statements in one conversation daily'
        ],
        'intervention': [
          'Challenge angry thoughts by asking "Is there another way to see this?"',
          'Practice assertive communication in one situation this week',
          'Use physical exercise to release anger energy for 15 minutes daily'
        ],
        'closure': [
          'Continue using your most effective anger management strategy',
          'Apply communication skills to prevent anger buildup',
          'Maintain awareness of anger triggers and early warning signs'
        ]
      }
    };

    const emotionGoals = goalTemplates[emotion || 'neutral'];
    if (emotionGoals && emotionGoals[phase]) {
      const goals = emotionGoals[phase];
      return goals[Math.floor(Math.random() * goals.length)];
    }

    // Default goals for any emotion/phase
    const defaultGoals = [
      'Practice mindfulness for 5 minutes daily',
      'Write down three thoughts and feelings each day',
      'Engage in one self-care activity daily',
      'Notice and appreciate one positive moment each day'
    ];

    return defaultGoals[Math.floor(Math.random() * defaultGoals.length)];
  }

  /**
   * Generate a fallback therapeutic response when AI models are unavailable
   */
  private generateFallbackResponse(userMessage: string, context: ConversationContext): string {
    const emotion = context.detectedEmotion?.toLowerCase() || 'neutral';
    const userName = context.userName || 'there';
    
    // Simple pattern matching for common therapeutic responses
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('anxious') || lowerMessage.includes('worried') || lowerMessage.includes('stress')) {
      return `I hear that you're feeling anxious, ${userName}. That's completely understandable. Let's try a simple breathing exercise - take a deep breath in for 4 counts, hold for 4, then exhale for 4. How does that feel?`;
    }
    
    if (lowerMessage.includes('sad') || lowerMessage.includes('depressed') || lowerMessage.includes('down')) {
      return `Thank you for sharing that with me, ${userName}. It takes courage to express when we're feeling down. Can you tell me about one small thing that brought you even a tiny bit of comfort today?`;
    }
    
    if (lowerMessage.includes('angry') || lowerMessage.includes('frustrated') || lowerMessage.includes('mad')) {
      return `I can sense your frustration, ${userName}. Those feelings are valid. Let's pause for a moment - what do you think might be underneath this anger? Sometimes anger can be protecting other feelings.`;
    }
    
    if (lowerMessage.includes('happy') || lowerMessage.includes('good') || lowerMessage.includes('great')) {
      return `I'm so glad to hear you're feeling positive, ${userName}! It's wonderful when we can recognize and appreciate these good moments. What do you think contributed to feeling this way?`;
    }
    
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hello ${userName}, I'm Numa. I'm here to listen and support you through whatever you're experiencing today. What's on your mind?`;
    }
    
    // Default empathetic response
    const responses = [
      `Thank you for sharing that with me, ${userName}. I'm here to listen and support you. Can you tell me more about what you're experiencing?`,
      `I appreciate you opening up, ${userName}. Your feelings are valid and important. What would be most helpful for you to explore right now?`,
      `I hear you, ${userName}. It sounds like you have a lot on your mind. Let's take this one step at a time - what feels most pressing for you today?`,
      `Thank you for trusting me with your thoughts, ${userName}. I'm here to help you work through whatever you're facing. What would you like to focus on?`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
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
   * Determine if session should be concluded based on conversation flow
   */
  shouldConcludeSession(
    conversationLength: number,
    sessionDuration?: number,
    userMessage?: string
  ): boolean {
    // Only conclude if session is very long (>15 exchanges) to allow for natural conversation flow
    if (conversationLength > 15) return true;
    
    // Conclude if session duration exceeds 60 minutes (increased from 45)
    if (sessionDuration && sessionDuration > 60) return true;
    
    // Conclude if user explicitly indicates they want to end
    const endingPhrases = [
      'goodbye',
      'see you later',
      'that\'s all for now',
      'i\'m done',
      'end session',
      'stop session'
    ];
    
    if (userMessage) {
      const lowerMessage = userMessage.toLowerCase();
      return endingPhrases.some(phrase => lowerMessage.includes(phrase));
    }
    
    return false;
  }

  /**
   * Generate session conclusion with summary prompt
   */
  async generateSessionConclusion(
    userMessage: string,
    context: ConversationContext,
    options: ConversationOptions = {}
  ): Promise<ConversationResult> {
    // Add conclusion guidance to context
    const conclusionContext = {
      ...context,
      sessionHistory: [
        ...(context.sessionHistory || []),
        'SESSION_CONCLUSION: This is the final exchange. Provide a warm closing, summarize key insights, and suggest a concrete goal for the user to work on before the next session.'
      ]
    };

    return this.generateResponse(userMessage, conclusionContext, {
      ...options,
      temperature: 0.6 // Slightly lower temperature for more consistent conclusions
    });
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
import { InferenceClient } from '@huggingface/inference';
import { huggingFaceClient } from './HuggingFaceClient';

export interface SessionSummaryOptions {
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SessionSummaryResult {
  summary: string;
  keyInsights?: string[];
  emotionalState?: string;
  progressNotes?: string;
  error?: string;
}

/**
 * Service for generating session summaries using AI
 */
export class SessionSummaryService {
  private client: InferenceClient;
  private readonly MODEL_NAME = 'gpt2';
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  constructor() {
    this.client = huggingFaceClient.getClient();
  }

  /**
   * Generate a therapeutic session summary from transcript
   */
  async generateSummary(
    transcript: string,
    sessionEmotion?: string,
    sessionDuration?: number,
    options: SessionSummaryOptions = {}
  ): Promise<SessionSummaryResult> {
    const {
      maxTokens = 200,
      temperature = 0.3, // Lower temperature for more consistent summaries
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    if (!transcript || transcript.trim().length === 0) {
      return {
        summary: 'No session content to summarize.',
        error: 'Empty transcript provided'
      };
    }

    let lastError: Error | null = null;
    let actualAttempts = 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      actualAttempts = attempt;
      try {
        console.log(`Session summary attempt ${attempt}/${maxRetries} using model: ${this.MODEL_NAME}`);

        const systemPrompt = this.buildSummaryPrompt(sessionEmotion, sessionDuration);
        const fullPrompt = this.formatSummaryPrompt(systemPrompt, transcript);

        const result = await this.client.textGeneration({
          model: this.MODEL_NAME,
          inputs: `Summarize this therapy session: ${transcript}`,
          parameters: {
            max_new_tokens: maxTokens,
            temperature: temperature,
            do_sample: true,
            top_p: 0.9,
            repetition_penalty: 1.1
          }
        });

        if (result && result.generated_text) {
          const response = this.extractSummaryResponse(result.generated_text, `Summarize this therapy session: ${transcript}`);
          const parsedSummary = this.parseSummaryResponse(response);
          
          return {
            summary: parsedSummary.summary,
            keyInsights: parsedSummary.keyInsights,
            emotionalState: parsedSummary.emotionalState || sessionEmotion,
            progressNotes: parsedSummary.progressNotes
          };
        } else {
          throw new Error('No summary generated');
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`Session summary attempt ${attempt} failed:`, error);

        if (this.isNonRetryableError(error)) {
          break;
        }

        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt);
        }
      }
    }

    return {
      summary: 'Unable to generate session summary at this time.',
      error: `Session summary generation failed after ${actualAttempts} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Build system prompt for session summary generation
   */
  private buildSummaryPrompt(sessionEmotion?: string, sessionDuration?: number): string {
    const emotionContext = sessionEmotion ? `The user's primary emotion was: ${sessionEmotion}` : '';
    const durationContext = sessionDuration ? `Session duration: ${sessionDuration} minutes` : '';

    return `You are a professional CBT therapist creating a concise session summary. Your summary should:

1. Capture the main topics and concerns discussed
2. Note any CBT techniques used or recommended
3. Identify key insights or breakthroughs
4. Record the user's emotional state and progress
5. Be professional, objective, and therapeutic in tone
6. Keep the summary under 150 words

${emotionContext}
${durationContext}

Format your response as:
SUMMARY: [Main session summary]
KEY_INSIGHTS: [Important insights or patterns identified]
EMOTIONAL_STATE: [User's emotional state and changes]
PROGRESS_NOTES: [Notable progress or areas for future focus]`;
  }

  /**
   * Format the complete prompt for summary generation
   */
  private formatSummaryPrompt(systemPrompt: string, transcript: string): string {
    // Truncate transcript if too long (keep last 2000 characters for context)
    const truncatedTranscript = transcript.length > 2000 
      ? '...' + transcript.slice(-2000) 
      : transcript;

    return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>

${systemPrompt}<|eot_id|><|start_header_id|>user<|end_header_id|>

Please create a session summary for the following therapy conversation:

${truncatedTranscript}<|eot_id|><|start_header_id|>assistant<|end_header_id|>

`;
  }

  /**
   * Extract the summary response from generated text
   */
  private extractSummaryResponse(generatedText: string, originalPrompt: string): string {
    let response = generatedText.replace(originalPrompt, '').trim();
    
    // Remove any remaining special tokens
    response = response.replace(/<\|[^|]+\|>/g, '').trim();
    
    // Split by common conversation markers and take the first part
    const markers = ['\n\nTranscript:', '\n\nUser:', '\n\n---'];
    for (const marker of markers) {
      const parts = response.split(marker);
      if (parts.length > 1) {
        response = parts[0].trim();
        break;
      }
    }

    return response;
  }

  /**
   * Parse the structured summary response
   */
  private parseSummaryResponse(response: string): {
    summary: string;
    keyInsights?: string[];
    emotionalState?: string;
    progressNotes?: string;
  } {
    const sections = {
      summary: '',
      keyInsights: [] as string[],
      emotionalState: '',
      progressNotes: ''
    };

    // Try to parse structured format
    const summaryMatch = response.match(/SUMMARY:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
    const insightsMatch = response.match(/KEY_INSIGHTS:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
    const emotionalMatch = response.match(/EMOTIONAL_STATE:\s*(.+?)(?=\n[A-Z_]+:|$)/s);
    const progressMatch = response.match(/PROGRESS_NOTES:\s*(.+?)(?=\n[A-Z_]+:|$)/s);

    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim();
    } else {
      // If no structured format, use the entire response as summary
      sections.summary = response.trim();
    }

    if (insightsMatch) {
      const insights = insightsMatch[1].trim();
      sections.keyInsights = insights.split(/[,;]/).map(insight => insight.trim()).filter(Boolean);
    }

    if (emotionalMatch) {
      sections.emotionalState = emotionalMatch[1].trim();
    }

    if (progressMatch) {
      sections.progressNotes = progressMatch[1].trim();
    }

    // Ensure summary is not empty
    if (!sections.summary) {
      sections.summary = 'Session completed with therapeutic discussion.';
    }

    return sections;
  }

  /**
   * Generate a brief session summary for context in future sessions
   */
  async generateContextSummary(
    transcript: string,
    sessionEmotion?: string
  ): Promise<string> {
    const fullSummary = await this.generateSummary(transcript, sessionEmotion, undefined, {
      maxTokens: 100,
      temperature: 0.2
    });

    if (fullSummary.error) {
      return `Session with ${sessionEmotion || 'mixed'} emotions - therapeutic discussion occurred.`;
    }

    // Return a condensed version for context
    const contextSummary = fullSummary.summary.split('.')[0] + '.';
    return contextSummary.length > 100 
      ? contextSummary.substring(0, 97) + '...'
      : contextSummary;
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
export const sessionSummaryService = new SessionSummaryService();
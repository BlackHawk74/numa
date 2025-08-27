import { HfInference } from '@huggingface/inference';
import { huggingFaceClient } from './HuggingFaceClient';

export interface STTResult {
  transcription: string;
  confidence?: number;
  error?: string;
}

export interface STTOptions {
  language?: string;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Speech-to-Text service using HuggingFace Whisper Large v3 Turbo
 */
export class SpeechToTextService {
  private client: HfInference;
  private readonly MODEL_NAME = 'openai/whisper-large-v3-turbo';
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000; // 1 second

  constructor() {
    this.client = huggingFaceClient.getClient();
  }

  /**
   * Convert audio to text using Whisper Large v3 Turbo
   */
  async transcribeAudio(
    audioBuffer: ArrayBuffer | Blob,
    options: STTOptions = {}
  ): Promise<STTResult> {
    const {
      language,
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`STT attempt ${attempt}/${maxRetries} using model: ${this.MODEL_NAME}`);

        // Ensure we have a Blob with proper MIME type
        let audioData: Blob;
        if (audioBuffer instanceof ArrayBuffer) {
          // Create a Blob with proper audio MIME type (default to webm)
          audioData = new Blob([audioBuffer], { type: 'audio/webm' });
        } else {
          audioData = audioBuffer;
          // Ensure the Blob has a proper MIME type
          if (!audioData.type || audioData.type === '') {
            // Re-create the Blob with a proper MIME type
            audioData = new Blob([audioData], { type: 'audio/webm' });
          }
        }

        const result = await this.client.automaticSpeechRecognition({
          model: this.MODEL_NAME,
          data: audioData,
          parameters: {
            language: language || 'en'
          }
        });

        if (result && result.text) {
          return {
            transcription: result.text.trim(),
            confidence: 1.0 // Whisper doesn't provide confidence scores
          };
        } else {
          throw new Error('No transcription result received');
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`STT attempt ${attempt} failed:`, error);

        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }

        // Wait before retrying (except on last attempt)
        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt); // Exponential backoff
        }
      }
    }

    return {
      transcription: '',
      error: `Speech-to-text failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    
    // Don't retry on authentication or quota errors
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

  /**
   * Validate audio format and size
   */
  validateAudioInput(audioBuffer: ArrayBuffer | Blob): { valid: boolean; error?: string } {
    const maxSize = 25 * 1024 * 1024; // 25MB limit for HuggingFace API
    
    let size: number;
    if (audioBuffer instanceof ArrayBuffer) {
      size = audioBuffer.byteLength;
    } else {
      size = audioBuffer.size;
    }

    if (size === 0) {
      return { valid: false, error: 'Audio buffer is empty' };
    }

    if (size > maxSize) {
      return { valid: false, error: `Audio file too large: ${size} bytes (max: ${maxSize} bytes)` };
    }

    return { valid: true };
  }

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[] {
    return ['wav', 'mp3', 'flac', 'ogg', 'webm', 'm4a'];
  }
}

// Export singleton instance
export const speechToTextService = new SpeechToTextService();
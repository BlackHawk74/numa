import { InferenceClient } from '@huggingface/inference';
import { huggingFaceClient } from './HuggingFaceClient';

export interface TTSResult {
  audioBuffer?: ArrayBuffer;
  audioUrl?: string;
  error?: string;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Text-to-Speech fallback service using Kokoro 82M
 * Note: This is used as fallback when browser Web Speech API is unavailable
 */
export class TextToSpeechService {
  private client: InferenceClient;
  private readonly MODEL_NAME = 'hexgrad/Kokoro-82M';
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  constructor() {
    this.client = huggingFaceClient.getClient();
  }

  /**
   * Convert text to speech using Kokoro 82M (fallback only)
   */
  async synthesizeSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const {
      maxRetries = this.DEFAULT_MAX_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY
    } = options;

    // Validate input
    if (!text || text.trim().length === 0) {
      return { error: 'Text input is required' };
    }

    if (text.length > 1000) {
      return { error: 'Text too long (max 1000 characters)' };
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`TTS attempt ${attempt}/${maxRetries} using model: ${this.MODEL_NAME}`);

        // Clean and prepare text for TTS
        const cleanText = this.prepareTextForTTS(text);

        const result = await (this.client as any).textToSpeech({
          model: this.MODEL_NAME,
          inputs: cleanText,
          provider: 'hf-inference'
        });

        if (result) {
          // Convert the result to ArrayBuffer
          const audioBuffer = await this.blobToArrayBuffer(result);
          
          return {
            audioBuffer,
            audioUrl: URL.createObjectURL(result)
          };
        } else {
          throw new Error('No audio generated');
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`TTS attempt ${attempt} failed:`, error);

        if (this.isNonRetryableError(error)) {
          break;
        }

        if (attempt < maxRetries) {
          await this.delay(retryDelay * attempt);
        }
      }
    }

    return {
      error: `Text-to-speech failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`
    };
  }

  /**
   * Check if browser Web Speech API is available
   */
  static isBrowserTTSAvailable(): boolean {
    try {
      // Check if we're in a browser environment
      const hasWindow = typeof (globalThis as any).window !== 'undefined';
      if (!hasWindow) return false;
      
      const win = (globalThis as any).window;
      return 'speechSynthesis' in win && 'SpeechSynthesisUtterance' in win;
    } catch {
      return false;
    }
  }

  /**
   * Get browser TTS voices (for frontend use)
   */
  static getBrowserVoices(): any[] {
    if (!this.isBrowserTTSAvailable()) {
      return [];
    }
    
    try {
      return (globalThis as any).window.speechSynthesis.getVoices();
    } catch {
      return [];
    }
  }

  /**
   * Synthesize speech using browser Web Speech API (primary method)
   */
  static synthesizeWithBrowser(
    text: string,
    options: { voice?: string; rate?: number; pitch?: number } = {}
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowserTTSAvailable()) {
        reject(new Error('Browser TTS not available'));
        return;
      }

      try {
        const win = (globalThis as any).window;
        const utterance = new win.SpeechSynthesisUtterance(text);
        
        // Configure voice settings for therapy
        utterance.rate = options.rate || 0.9; // Slightly slower for therapy
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = 1.0;

        // Select voice if specified
        if (options.voice) {
          const voices = win.speechSynthesis.getVoices();
          const selectedVoice = voices.find((voice: any) => 
            voice.name.includes(options.voice!) || 
            voice.lang.includes(options.voice!)
          );
          if (selectedVoice) {
            utterance.voice = selectedVoice;
          }
        }

        utterance.onend = () => resolve();
        utterance.onerror = (event: any) => reject(new Error(`Speech synthesis failed: ${event.error}`));

        win.speechSynthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Prepare text for TTS by cleaning and formatting
   */
  private prepareTextForTTS(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s.,!?;:-]/g, '') // Remove special characters
      .substring(0, 1000); // Ensure length limit
  }

  /**
   * Convert Blob to ArrayBuffer
   */
  private async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    // In Node.js environment, use Buffer
    if (typeof (globalThis as any).window === 'undefined') {
      return blob.arrayBuffer();
    }
    
    // In browser environment, use FileReader
    return new Promise((resolve, reject) => {
      const reader = new (globalThis as any).window.FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to convert blob to ArrayBuffer'));
      reader.readAsArrayBuffer(blob);
    });
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
      errorMessage.includes('invalid api key') ||
      errorMessage.includes('model not found')
    );
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate text input for TTS
   */
  validateTextInput(text: string): { valid: boolean; error?: string } {
    if (!text || text.trim().length === 0) {
      return { valid: false, error: 'Text input is required' };
    }

    if (text.length > 1000) {
      return { valid: false, error: 'Text too long (max 1000 characters)' };
    }

    return { valid: true };
  }

  /**
   * Get service status and configuration
   */
  getServiceInfo() {
    return {
      model: this.MODEL_NAME,
      maxTextLength: 1000,
      supportedLanguages: ['en'], // Kokoro primarily supports English
      fallbackOnly: true,
      browserTTSAvailable: TextToSpeechService.isBrowserTTSAvailable()
    };
  }
}

// Export singleton instance
export const textToSpeechService = new TextToSpeechService();
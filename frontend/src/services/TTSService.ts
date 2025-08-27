// Comprehensive Text-to-Speech service with browser and fallback integration
// Handles voice synthesis with automatic fallback to HuggingFace TTS

import { speechSynthesis, SpeechSynthesisManager, SpeechOptions, SpeechPlaybackControls } from '../utils/speechSynthesis';

export interface TTSServiceOptions extends SpeechOptions {
  useFallback?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface TTSResult {
  success: boolean;
  controls?: SpeechPlaybackControls;
  audioUrl?: string;
  usedFallback: boolean;
  error?: string;
}

export interface TTSServiceStatus {
  browserTTSAvailable: boolean;
  fallbackTTSAvailable: boolean;
  currentVoice?: string;
  isInitialized: boolean;
  lastError?: string;
}

/**
 * Comprehensive TTS service that manages both browser and fallback TTS
 */
export class TTSService {
  private static instance: TTSService;
  private isInitialized = false;
  private fallbackAvailable = false;
  private lastError?: string;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): TTSService {
    if (!TTSService.instance) {
      TTSService.instance = new TTSService();
    }
    return TTSService.instance;
  }

  /**
   * Initialize the TTS service
   */
  private async initialize(): Promise<void> {
    try {
      // Check fallback TTS availability
      await this.checkFallbackAvailability();
      this.isInitialized = true;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Initialization failed';
      console.error('TTS Service initialization failed:', error);
    }
  }

  /**
   * Check if fallback TTS is available
   */
  private async checkFallbackAvailability(): Promise<void> {
    try {
      // Simple fetch to check if TTS endpoint is available
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/tts/browser-check`);
      this.fallbackAvailable = response.ok;
    } catch (error) {
      this.fallbackAvailable = false;
      console.warn('Fallback TTS not available:', error);
    }
  }

  /**
   * Speak text using the best available method
   */
  public async speak(text: string, options: TTSServiceOptions = {}): Promise<TTSResult> {
    const { useFallback = false, ...speechOptions } = options;

    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        usedFallback: false,
        error: 'Text input is required'
      };
    }

    if (text.length > 1000) {
      return {
        success: false,
        usedFallback: false,
        error: 'Text too long (max 1000 characters)'
      };
    }

    // Try browser TTS first (unless fallback is explicitly requested)
    if (!useFallback && SpeechSynthesisManager.isSupported()) {
      try {
        const controls = await this.speakWithBrowser(text, speechOptions);
        return {
          success: true,
          controls,
          usedFallback: false
        };
      } catch (error) {
        console.warn('Browser TTS failed, trying fallback:', error);
        
        // If browser TTS fails, try fallback
        if (this.fallbackAvailable) {
          return await this.speakWithFallback(text, options);
        } else {
          return {
            success: false,
            usedFallback: false,
            error: error instanceof Error ? error.message : 'Browser TTS failed'
          };
        }
      }
    }

    // Use fallback TTS
    if (this.fallbackAvailable) {
      return await this.speakWithFallback(text, options);
    }

    return {
      success: false,
      usedFallback: false,
      error: 'No TTS method available'
    };
  }

  /**
   * Speak using browser Web Speech API
   */
  private async speakWithBrowser(text: string, options: SpeechOptions): Promise<SpeechPlaybackControls> {
    if (!SpeechSynthesisManager.isSupported()) {
      throw new Error('Browser TTS not supported');
    }

    // Ensure voices are loaded
    await this.waitForVoices();

    // Use best therapy voice if no voice specified
    if (!options.voice) {
      const bestVoice = speechSynthesis.getBestTherapyVoice();
      if (bestVoice) {
        options.voice = bestVoice;
      }
    }

    return await speechSynthesis.speak(text, options);
  }

  /**
   * Speak using fallback HuggingFace TTS
   */
  private async speakWithFallback(text: string, options: TTSServiceOptions): Promise<TTSResult> {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice: options.voice?.name,
          speed: options.rate
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS API error: ${response.statusText}`);
      }

      // Check if response is JSON (error) or binary (audio)
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        if (data.error) {
          return {
            success: false,
            usedFallback: true,
            error: data.error
          };
        }
      }

      // Handle audio response
      const audioBlob = await response.blob();
      let audioUrl: string;
      
      if (typeof window !== 'undefined' && window.URL) {
        audioUrl = URL.createObjectURL(audioBlob);
      } else {
        // In test environment, create a mock URL
        audioUrl = 'mock-audio-url';
      }
      
      // Play the audio (skip in test environment)
      if (typeof window !== 'undefined' && window.Audio) {
        await this.playAudioUrl(audioUrl);
      }

      return {
        success: true,
        audioUrl,
        usedFallback: true
      };

    } catch (error) {
      return {
        success: false,
        usedFallback: true,
        error: error instanceof Error ? error.message : 'Fallback TTS failed'
      };
    }
  }

  /**
   * Play audio from URL
   */
  private async playAudioUrl(audioUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // In test environment, just resolve immediately
      if (typeof window === 'undefined' || !window.Audio) {
        resolve();
        return;
      }

      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
        resolve();
      };
      
      audio.onerror = () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
        reject(new Error('Failed to play audio'));
      };
      
      audio.play().catch(reject);
    });
  }

  /**
   * Wait for voices to be loaded (some browsers load them asynchronously)
   */
  private async waitForVoices(timeout = 5000): Promise<void> {
    return new Promise((resolve) => {
      try {
        const voices = speechSynthesis.getAvailableVoices();
        if (voices && voices.length > 0) {
          resolve();
          return;
        }
      } catch (error) {
        // In test environment or if speechSynthesis is not available
        resolve();
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve(); // Resolve anyway after timeout
      }, timeout);

      const checkVoices = () => {
        try {
          const voices = speechSynthesis.getAvailableVoices();
          if (voices && voices.length > 0) {
            clearTimeout(timeoutId);
            resolve();
          }
        } catch (error) {
          // Ignore errors in test environment
        }
      };

      // Check periodically
      const intervalId = setInterval(checkVoices, 100);
      
      setTimeout(() => {
        clearInterval(intervalId);
      }, timeout);
    });
  }

  /**
   * Stop current speech synthesis
   */
  public stop(): void {
    speechSynthesis.stop();
  }

  /**
   * Pause current speech
   */
  public pause(): void {
    speechSynthesis.pause();
  }

  /**
   * Resume paused speech
   */
  public resume(): void {
    speechSynthesis.resume();
  }

  /**
   * Get available voices
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return speechSynthesis.getAvailableVoices();
  }

  /**
   * Set the preferred voice
   */
  public setVoice(voice: SpeechSynthesisVoice | null): void {
    speechSynthesis.setVoice(voice);
  }

  /**
   * Get the current voice
   */
  public getCurrentVoice(): SpeechSynthesisVoice | null {
    return speechSynthesis.getCurrentVoice();
  }

  /**
   * Get the best voice for therapy
   */
  public getBestTherapyVoice(): SpeechSynthesisVoice | null {
    return speechSynthesis.getBestTherapyVoice();
  }

  /**
   * Test TTS functionality
   */
  public async testTTS(): Promise<{ browserTTS: boolean; fallbackTTS: boolean }> {
    const results = {
      browserTTS: false,
      fallbackTTS: false
    };

    // Test browser TTS
    if (SpeechSynthesisManager.isSupported()) {
      try {
        results.browserTTS = await speechSynthesis.testSpeech();
      } catch (error) {
        console.error('Browser TTS test failed:', error);
      }
    }

    // Test fallback TTS
    if (this.fallbackAvailable) {
      try {
        const result = await this.speakWithFallback('Test', { useFallback: true });
        results.fallbackTTS = result.success;
      } catch (error) {
        console.error('Fallback TTS test failed:', error);
      }
    }

    return results;
  }

  /**
   * Get service status
   */
  public getStatus(): TTSServiceStatus {
    return {
      browserTTSAvailable: SpeechSynthesisManager.isSupported(),
      fallbackTTSAvailable: this.fallbackAvailable,
      currentVoice: speechSynthesis.getCurrentVoice()?.name,
      isInitialized: this.isInitialized,
      lastError: this.lastError
    };
  }

  /**
   * Reinitialize the service
   */
  public async reinitialize(): Promise<void> {
    this.isInitialized = false;
    this.lastError = undefined;
    await this.initialize();
  }
}

// Export singleton instance
export const ttsService = TTSService.getInstance();
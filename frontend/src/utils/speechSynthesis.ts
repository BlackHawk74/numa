// Enhanced Web Speech API wrapper for Numa AI Therapist
// Provides comprehensive text-to-speech functionality with fallback mechanisms

export interface SpeechOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export interface SpeechPlaybackControls {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPaused: boolean;
  isSpeaking: boolean;
}

export interface VoiceSelectionCriteria {
  preferFemale?: boolean;
  preferLocal?: boolean;
  language?: string;
  voiceName?: string;
}

/**
 * Enhanced Web Speech API wrapper with comprehensive voice management
 */
export class SpeechSynthesisManager {
  private static instance: SpeechSynthesisManager;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isInitialized = false;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private playbackControls: SpeechPlaybackControls | null = null;

  private constructor() {
    this.initializeVoices();
  }

  public static getInstance(): SpeechSynthesisManager {
    if (!SpeechSynthesisManager.instance) {
      SpeechSynthesisManager.instance = new SpeechSynthesisManager();
    }
    return SpeechSynthesisManager.instance;
  }

  /**
   * Check if Web Speech API is supported
   */
  public static isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      'SpeechSynthesisUtterance' in window
    );
  }

  /**
   * Initialize voices and set up event listeners
   */
  private initializeVoices(): void {
    if (!SpeechSynthesisManager.isSupported()) {
      console.warn('Web Speech API is not supported in this browser');
      return;
    }

    // Load voices immediately if available
    this.loadVoices();

    // Set up voice loading event listener for browsers that load voices asynchronously
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = () => {
        this.loadVoices();
      };
    }

    this.isInitialized = true;
  }

  /**
   * Load and filter available voices
   */
  private loadVoices(): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    const voices = window.speechSynthesis.getVoices();
    
    // Filter for English voices and sort by quality
    this.availableVoices = voices
      .filter(voice => voice.lang.startsWith('en'))
      .sort((a, b) => {
        // Prefer local voices
        if (a.localService && !b.localService) return -1;
        if (!a.localService && b.localService) return 1;
        
        // Prefer female voices for therapy
        const aIsFemale = this.isFemaleVoice(a);
        const bIsFemale = this.isFemaleVoice(b);
        if (aIsFemale && !bIsFemale) return -1;
        if (!aIsFemale && bIsFemale) return 1;
        
        return a.name.localeCompare(b.name);
      });

    // Auto-select best voice if none selected
    if (!this.selectedVoice && this.availableVoices.length > 0) {
      this.selectedVoice = this.getBestTherapyVoice();
    }
  }

  /**
   * Determine if a voice is likely female based on name patterns
   */
  private isFemaleVoice(voice: SpeechSynthesisVoice): boolean {
    const femaleNames = [
      'female', 'woman', 'samantha', 'karen', 'susan', 'victoria', 
      'alice', 'emma', 'sarah', 'anna', 'maria', 'lisa', 'jenny',
      'kate', 'amy', 'helen', 'claire', 'zoe', 'fiona'
    ];
    
    const voiceName = voice.name.toLowerCase();
    return femaleNames.some(name => voiceName.includes(name));
  }

  /**
   * Get the best voice for therapy based on criteria
   */
  public getBestTherapyVoice(criteria: VoiceSelectionCriteria = {}): SpeechSynthesisVoice | null {
    if (this.availableVoices.length === 0) {
      return null;
    }

    const {
      preferFemale = true,
      preferLocal = true,
      language = 'en-US',
      voiceName
    } = criteria;

    // If specific voice name is requested
    if (voiceName) {
      const namedVoice = this.availableVoices.find(voice => 
        voice.name.toLowerCase().includes(voiceName.toLowerCase())
      );
      if (namedVoice) return namedVoice;
    }

    // Score voices based on criteria
    const scoredVoices = this.availableVoices.map(voice => {
      let score = 0;
      
      // Language preference
      if (voice.lang.startsWith(language.split('-')[0])) score += 10;
      if (voice.lang === language) score += 5;
      
      // Local vs remote preference
      if (preferLocal && voice.localService) score += 8;
      if (!preferLocal && !voice.localService) score += 8;
      
      // Gender preference
      if (preferFemale && this.isFemaleVoice(voice)) score += 6;
      if (!preferFemale && !this.isFemaleVoice(voice)) score += 6;
      
      // Quality indicators
      if (voice.name.toLowerCase().includes('premium')) score += 3;
      if (voice.name.toLowerCase().includes('enhanced')) score += 2;
      
      return { voice, score };
    });

    // Return highest scored voice
    scoredVoices.sort((a, b) => b.score - a.score);
    return scoredVoices[0]?.voice || this.availableVoices[0];
  }

  /**
   * Get all available voices
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    return [...this.availableVoices];
  }

  /**
   * Set the current voice
   */
  public setVoice(voice: SpeechSynthesisVoice | null): void {
    this.selectedVoice = voice;
  }

  /**
   * Get the currently selected voice
   */
  public getCurrentVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
  }

  /**
   * Speak text with enhanced options and controls
   */
  public async speak(text: string, options: SpeechOptions = {}): Promise<SpeechPlaybackControls> {
    if (!SpeechSynthesisManager.isSupported()) {
      throw new Error('Web Speech API is not supported in this browser');
    }

    // Cancel any ongoing speech
    this.stop();

    // Prepare text for therapy speech
    const preparedText = this.prepareTextForTherapy(text);
    
    // Create utterance
    this.currentUtterance = new window.SpeechSynthesisUtterance(preparedText);
    
    // Configure utterance with therapy-optimized settings
    this.currentUtterance.voice = options.voice || this.selectedVoice;
    this.currentUtterance.rate = options.rate || 0.85; // Slower for therapy
    this.currentUtterance.pitch = options.pitch || 1.0;
    this.currentUtterance.volume = options.volume || 0.9;
    this.currentUtterance.lang = options.lang || 'en-US';

    // Create playback controls
    this.playbackControls = this.createPlaybackControls();

    // Set up event handlers
    return new Promise((resolve, reject) => {
      if (!this.currentUtterance) {
        reject(new Error('Failed to create utterance'));
        return;
      }

      let hasResolved = false;
      const timeout = setTimeout(() => {
        if (!hasResolved) {
          this.stop();
          reject(new Error('Speech synthesis timed out'));
        }
      }, 60000); // 60 second timeout

      this.currentUtterance.onstart = () => {
        if (!hasResolved) {
          hasResolved = true;
          clearTimeout(timeout);
          resolve(this.playbackControls!);
        }
      };

      this.currentUtterance.onend = () => {
        clearTimeout(timeout);
        this.currentUtterance = null;
        this.playbackControls = null;
      };

      this.currentUtterance.onerror = (event) => {
        clearTimeout(timeout);
        this.currentUtterance = null;
        this.playbackControls = null;
        
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        }
      };

      // Start speaking
      try {
        window.speechSynthesis.speak(this.currentUtterance);
      } catch (error) {
        clearTimeout(timeout);
        if (!hasResolved) {
          hasResolved = true;
          reject(new Error('Failed to start speech synthesis'));
        }
      }
    });
  }

  /**
   * Create playback controls for the current utterance
   */
  private createPlaybackControls(): SpeechPlaybackControls {
    return {
      pause: () => {
        if (typeof window !== 'undefined' && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
        }
      },
      resume: () => {
        if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      },
      stop: () => {
        this.stop();
      },
      get isPaused() {
        return typeof window !== 'undefined' ? window.speechSynthesis.paused : false;
      },
      get isSpeaking() {
        return typeof window !== 'undefined' ? window.speechSynthesis.speaking : false;
      }
    };
  }

  /**
   * Prepare text for therapeutic speech delivery
   */
  private prepareTextForTherapy(text: string): string {
    return text
      .trim()
      // Add natural pauses for better therapeutic delivery
      .replace(/\. /g, '. ... ')
      .replace(/\? /g, '? ... ')
      .replace(/! /g, '! ... ')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Ensure proper sentence endings
      .replace(/([.!?])\s*$/, '$1');
  }

  /**
   * Stop current speech synthesis
   */
  public stop(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.currentUtterance = null;
    this.playbackControls = null;
  }

  /**
   * Pause current speech
   */
  public pause(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  public resume(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  public isSpeaking(): boolean {
    return typeof window !== 'undefined' ? window.speechSynthesis.speaking : false;
  }

  /**
   * Check if currently paused
   */
  public isPaused(): boolean {
    return typeof window !== 'undefined' ? window.speechSynthesis.paused : false;
  }

  /**
   * Get speech synthesis status
   */
  public getStatus() {
    return {
      isSupported: SpeechSynthesisManager.isSupported(),
      isInitialized: this.isInitialized,
      isSpeaking: this.isSpeaking(),
      isPaused: this.isPaused(),
      availableVoicesCount: this.availableVoices.length,
      currentVoice: this.selectedVoice?.name || 'None selected',
      hasPlaybackControls: this.playbackControls !== null
    };
  }

  /**
   * Test speech synthesis with a sample phrase
   */
  public async testSpeech(): Promise<boolean> {
    try {
      const controls = await this.speak('Hello, this is a test of the speech synthesis system.');
      
      // Wait a moment then stop
      setTimeout(() => {
        controls.stop();
      }, 2000);
      
      return true;
    } catch (error) {
      console.error('Speech synthesis test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const speechSynthesis = SpeechSynthesisManager.getInstance();
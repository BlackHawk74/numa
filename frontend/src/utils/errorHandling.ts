// Enhanced error handling utilities for Numa AI Therapist

export interface ErrorInfo {
  type: 'network' | 'api' | 'audio' | 'validation' | 'permission' | 'unknown';
  code?: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  context?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export class ErrorHandler {
  private static defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  };

  /**
   * Parse and categorize errors into user-friendly format
   */
  static parseError(error: unknown, context?: Record<string, any>): ErrorInfo {
    const timestamp = new Date();
    
    if (error instanceof Error) {
      // Network errors
      if (error.message.includes('fetch') || 
          error.message.includes('NetworkError') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('ECONNREFUSED')) {
        return {
          type: 'network',
          message: error.message,
          userMessage: 'Connection issue. Please check your internet connection and try again.',
          retryable: true,
          severity: 'medium',
          timestamp,
          context,
        };
      }

      // API errors
      if (error.message.includes('API error') || 
          error.message.includes('503') ||
          error.message.includes('502') ||
          error.message.includes('500')) {
        return {
          type: 'api',
          message: error.message,
          userMessage: 'Our AI service is temporarily unavailable. Please try again in a moment.',
          retryable: true,
          severity: 'medium',
          timestamp,
          context,
        };
      }

      // Audio errors
      if (error.message.includes('microphone') ||
          error.message.includes('audio') ||
          error.message.includes('MediaRecorder') ||
          error.message.includes('getUserMedia')) {
        return {
          type: 'audio',
          message: error.message,
          userMessage: 'Audio access issue. Please check your microphone permissions and try again.',
          retryable: false,
          severity: 'high',
          timestamp,
          context,
        };
      }

      // Permission errors
      if (error.message.includes('permission') ||
          error.message.includes('NotAllowedError') ||
          error.message.includes('denied')) {
        return {
          type: 'permission',
          message: error.message,
          userMessage: 'Permission required. Please allow microphone access to continue.',
          retryable: false,
          severity: 'high',
          timestamp,
          context,
        };
      }

      // Validation errors
      if (error.message.includes('validation') ||
          error.message.includes('invalid') ||
          error.message.includes('required')) {
        return {
          type: 'validation',
          message: error.message,
          userMessage: 'Please check your input and try again.',
          retryable: false,
          severity: 'low',
          timestamp,
          context,
        };
      }
    }

    // Unknown error
    return {
      type: 'unknown',
      message: error instanceof Error ? error.message : String(error),
      userMessage: 'Something unexpected happened. Please try again.',
      retryable: true,
      severity: 'medium',
      timestamp,
      context,
    };
  }

  /**
   * Retry function with exponential backoff
   */
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (attempt: number, error: Error) => void
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Check if error is retryable
        const errorInfo = this.parseError(error);
        if (!errorInfo.retryable) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffFactor, attempt - 1),
          finalConfig.maxDelay
        );

        // Call retry callback if provided
        onRetry?.(attempt, lastError);

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(lastError!.message);
  }

  /**
   * Log error for monitoring
   */
  static logError(errorInfo: ErrorInfo): void {
    const logData = {
      ...errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: errorInfo.timestamp.toISOString(),
    };

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', logData);
    }

    // In production, this could send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to monitoring service
      // this.sendToMonitoring(logData);
    }
  }

  /**
   * Send error to monitoring service (placeholder)
   */
  private static async sendToMonitoring(errorData: any): Promise<void> {
    try {
      // This would integrate with services like Sentry, LogRocket, etc.
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorData),
      // });
    } catch (error) {
      console.warn('Failed to send error to monitoring:', error);
    }
  }
}

/**
 * Network connectivity detection
 */
export class NetworkMonitor {
  private static listeners: Array<(online: boolean) => void> = [];
  private static isOnline = navigator.onLine;
  private static initialized = false;

  private static initialize() {
    if (this.initialized) return;
    
    // Initialize network monitoring
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
    
    this.initialized = true;
  }

  static getStatus(): boolean {
    this.initialize();
    return this.isOnline;
  }

  static addListener(callback: (online: boolean) => void): () => void {
    this.initialize();
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private static notifyListeners(online: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(online);
      } catch (error) {
        console.warn('Network listener error:', error);
      }
    });
  }

  /**
   * Test actual connectivity by making a lightweight request
   */
  static async testConnectivity(): Promise<boolean> {
    this.initialize();
    if (!this.isOnline) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Feature detection utilities
 */
export class FeatureDetector {
  static checkAudioSupport(): {
    recording: boolean;
    playback: boolean;
    speechSynthesis: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    const recording = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    if (!recording) {
      issues.push('Microphone access not supported');
    }

    const playback = !!(window.Audio || window.HTMLAudioElement);
    if (!playback) {
      issues.push('Audio playback not supported');
    }

    const speechSynthesis = !!(window.speechSynthesis && window.SpeechSynthesisUtterance);
    if (!speechSynthesis) {
      issues.push('Text-to-speech not supported');
    }

    return { recording, playback, speechSynthesis, issues };
  }

  static checkBrowserSupport(): {
    supported: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check for required APIs
    if (!window.fetch) {
      issues.push('Fetch API not supported');
      recommendations.push('Please update your browser');
    }

    if (!window.Promise) {
      issues.push('Promises not supported');
      recommendations.push('Please update your browser');
    }

    if (!window.MediaRecorder) {
      issues.push('MediaRecorder API not supported');
      recommendations.push('Try using Chrome, Firefox, or Safari');
    }

    // Check for WebRTC support
    if (!navigator.mediaDevices) {
      issues.push('WebRTC not supported');
      recommendations.push('Please use a modern browser with WebRTC support');
    }

    // Check for HTTPS (required for microphone access)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push('HTTPS required for microphone access');
      recommendations.push('Please access the site via HTTPS');
    }

    return {
      supported: issues.length === 0,
      issues,
      recommendations,
    };
  }
}
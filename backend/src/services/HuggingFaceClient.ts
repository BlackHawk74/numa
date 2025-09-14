import { InferenceClient } from '@huggingface/inference';
import { requestCache, rateLimiter } from '../middleware/rateLimiting';
import { usageMonitoringService } from './UsageMonitoringService';

/**
 * Enhanced HuggingFace API client with caching, rate limiting, and cost optimization
 */
export class HuggingFaceClient {
  private client: InferenceClient;
  private apiKey: string;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private readonly maxConcurrentRequests = 3;
  private activeRequests = 0;
  // Prefer Hugging Face serverless inference provider (no external paid providers)
  private readonly defaultProvider = 'hf-inference';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '';

    if (!this.apiKey || this.apiKey === 'dummy-key-for-testing') {
      console.warn('Warning: HuggingFace API key not provided. API calls will fail.');
      // Don't throw error to allow testing without API key
      this.client = new InferenceClient('dummy-key-for-testing');
    } else {
      this.client = new InferenceClient(this.apiKey);
    }
  }

  /**
   * Get the HuggingFace inference client
   */
  getClient(): InferenceClient {
    return this.client;
  }

  /**
   * Enhanced text generation with caching and monitoring
   */
  async textGeneration(params: {
    model: string;
    inputs: string;
    parameters?: any;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = requestCache.generateHFKey(params.model, params.inputs, params.parameters);
      const cached = requestCache.get(cacheKey);
      
      if (cached) {
        rateLimiter.recordCacheHit();
        usageMonitoringService.recordPerformance('textGeneration', Date.now() - startTime, true);
        return cached;
      }

      rateLimiter.recordCacheMiss();

      // Queue request to manage concurrency
      const result = await this.queueRequest(async () => {
        try {
          // Force provider to hf-inference when available
          const response = await (this.client as any).textGeneration({ ...(params as any), provider: this.defaultProvider });
          
          // Record usage for cost tracking
          const inputSize = params.inputs.length;
          const outputSize = JSON.stringify(response).length;
          rateLimiter.recordApiCall(params.model, inputSize, outputSize);
          
          return response;
        } catch (error: any) {
          // If text-generation is not supported, try chat completion
          if (error.message?.includes('not supported') || error.message?.includes('conversational')) {
            console.log('Falling back to chat completion for model:', params.model);
            return await this.chatCompletion({
              model: params.model,
              messages: [{ role: 'user', content: params.inputs }],
              max_tokens: params.parameters?.max_new_tokens || 100
            });
          }
          throw error;
        }
      });

      // Cache successful response
      requestCache.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes for text generation
      
      usageMonitoringService.recordPerformance('textGeneration', Date.now() - startTime, true);
      return result;

    } catch (error) {
      usageMonitoringService.recordPerformance('textGeneration', Date.now() - startTime, false);
      throw this.enhanceError(error, 'textGeneration', params);
    }
  }

  /**
   * Enhanced chat completion with caching and monitoring
   */
  async chatCompletion(params: {
    model: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    max_tokens?: number;
    temperature?: number;
    parameters?: any;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = requestCache.generateHFKey(params.model, JSON.stringify(params.messages), params.parameters);
      const cached = requestCache.get(cacheKey);
      
      if (cached) {
        rateLimiter.recordCacheHit();
        usageMonitoringService.recordPerformance('chatCompletion', Date.now() - startTime, true);
        return cached;
      }

      rateLimiter.recordCacheMiss();

      const result = await this.queueRequest(async () => {
        // Force provider to hf-inference when available
        const response = await (this.client as any).chatCompletion({ ...(params as any), provider: this.defaultProvider });
        
        // Record usage for cost tracking
        const inputSize = JSON.stringify(params.messages).length;
        const outputSize = JSON.stringify(response).length;
        rateLimiter.recordApiCall(params.model, inputSize, outputSize);
        
        return response;
      });

      // Cache successful response
      requestCache.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes for chat completion
      
      usageMonitoringService.recordPerformance('chatCompletion', Date.now() - startTime, true);
      return result;

    } catch (error) {
      usageMonitoringService.recordPerformance('chatCompletion', Date.now() - startTime, false);
      throw this.enhanceError(error, 'chatCompletion', params);
    }
  }

  /**
   * Legacy conversational method for backward compatibility
   * @deprecated Use chatCompletion instead
   */
  async conversational(params: {
    model: string;
    inputs: {
      text: string;
      past_user_inputs?: string[];
      generated_responses?: string[];
    };
    parameters?: any;
  }): Promise<any> {
    // Convert to chat completion format
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    
    // Add conversation history if available
    if (params.inputs.past_user_inputs && params.inputs.generated_responses) {
      for (let i = 0; i < params.inputs.past_user_inputs.length; i++) {
        messages.push({ role: 'user', content: params.inputs.past_user_inputs[i] });
        if (params.inputs.generated_responses[i]) {
          messages.push({ role: 'assistant', content: params.inputs.generated_responses[i] });
        }
      }
    }
    
    // Add current message
    messages.push({ role: 'user', content: params.inputs.text });
    
    return this.chatCompletion({
      model: params.model,
      messages,
      max_tokens: params.parameters?.max_length || 100,
      temperature: params.parameters?.temperature || 0.7
    });
  }

  /**
   * Enhanced automatic speech recognition with caching
   */
  async automaticSpeechRecognition(params: {
    model: string;
    data: Blob | ArrayBuffer;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // For audio, we'll use a simpler cache key based on file size and model
      const audioSize = params.data instanceof Blob ? params.data.size : params.data.byteLength;
      
      // Skip caching for audio for now due to size constraints
      // In production, consider using a separate audio cache with file hashes
      
      const result = await this.queueRequest(async () => {
        // Force provider to hf-inference when available
        const response = await (this.client as any).automaticSpeechRecognition({ ...(params as any), provider: this.defaultProvider });
        
        // Record usage for cost tracking (audio is typically charged per second)
        rateLimiter.recordApiCall(params.model, audioSize, JSON.stringify(response).length);
        
        return response;
      });

      usageMonitoringService.recordPerformance('speechRecognition', Date.now() - startTime, true);
      return result;

    } catch (error) {
      usageMonitoringService.recordPerformance('speechRecognition', Date.now() - startTime, false);
      throw this.enhanceError(error, 'automaticSpeechRecognition', params);
    }
  }

  /**
   * Enhanced text classification (sentiment analysis) with caching
   */
  async textClassification(params: {
    model: string;
    inputs: string;
  }): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = requestCache.generateHFKey(params.model, params.inputs);
      const cached = requestCache.get(cacheKey);
      
      if (cached) {
        rateLimiter.recordCacheHit();
        usageMonitoringService.recordPerformance('textClassification', Date.now() - startTime, true);
        return cached;
      }

      rateLimiter.recordCacheMiss();

      const result = await this.queueRequest(async () => {
        // Force provider to hf-inference when available
        const response = await (this.client as any).textClassification({ ...(params as any), provider: this.defaultProvider });
        
        // Record usage for cost tracking
        const inputSize = params.inputs.length;
        const outputSize = JSON.stringify(response).length;
        rateLimiter.recordApiCall(params.model, inputSize, outputSize);
        
        return response;
      });

      // Cache sentiment analysis results for longer (they don't change often)
      requestCache.set(cacheKey, result, 30 * 60 * 1000); // 30 minutes
      
      usageMonitoringService.recordPerformance('textClassification', Date.now() - startTime, true);
      return result;

    } catch (error) {
      usageMonitoringService.recordPerformance('textClassification', Date.now() - startTime, false);
      throw this.enhanceError(error, 'textClassification', params);
    }
  }

  /**
   * Queue requests to manage concurrency and prevent API overload
   */
  private async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          this.activeRequests++;
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      });

      this.processQueue();
    });
  }

  /**
   * Process queued requests with concurrency control
   */
  private processQueue(): void {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    if (this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessingQueue = true;
    const request = this.requestQueue.shift();
    
    if (request) {
      request().finally(() => {
        this.isProcessingQueue = false;
        // Process next request if available
        setTimeout(() => this.processQueue(), 100);
      });
    } else {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Enhance error messages with context and retry information
   */
  private enhanceError(error: any, operation: string, params: any): Error {
    const enhancedError = new Error(`HuggingFace ${operation} failed: ${error.message}`);
    
    // Add retry information for rate limit errors
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      (enhancedError as any).retryable = true;
      (enhancedError as any).retryAfter = 60; // seconds
    }

    // Add context for debugging
    (enhancedError as any).operation = operation;
    (enhancedError as any).model = params.model;
    (enhancedError as any).originalError = error;

    return enhancedError;
  }

  /**
   * Test API connection with enhanced error handling
   */
  async testConnection(): Promise<boolean> {
    try {
      // Prefer a free, chat-capable model on HF serverless
      await this.chatCompletion({
        model: 'google/gemma-2-2b-it',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 10
      });
      return true;
    } catch (error) {
      console.error('HuggingFace chat completion test failed:', error);
      // Fallback to a small instruct model for text generation
      try {
        await this.textGeneration({
          model: 'tiiuae/falcon-7b-instruct',
          inputs: 'test',
          parameters: { max_new_tokens: 1 }
        });
        return true;
      } catch (genError) {
        console.error('HuggingFace text generation test also failed:', genError);
        return false;
      }
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'dummy-key-for-testing';
  }

  /**
   * Get queue status for monitoring
   */
  getQueueStatus(): {
    queueLength: number;
    activeRequests: number;
    maxConcurrent: number;
  } {
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.maxConcurrentRequests
    };
  }

  /**
   * Clear request queue (for emergency situations)
   */
  clearQueue(): void {
    this.requestQueue = [];
    console.warn('HuggingFace request queue cleared');
  }
}

// Export singleton instance
export const huggingFaceClient = new HuggingFaceClient();
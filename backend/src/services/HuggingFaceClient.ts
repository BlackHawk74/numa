import { HfInference } from '@huggingface/inference';

/**
 * HuggingFace API client wrapper with authentication and error handling
 */
export class HuggingFaceClient {
  private client: HfInference;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || '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';
    
    if (!this.apiKey || this.apiKey === 'dummy-key-for-testing') {
      console.warn('Warning: HuggingFace API key not provided. API calls will fail.');
      // Don't throw error to allow testing without API key
      this.client = new HfInference('dummy-key-for-testing');
    } else {
      this.client = new HfInference(this.apiKey);
    }
  }

  /**
   * Get the HuggingFace inference client
   */
  getClient(): HfInference {
    return this.client;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a simple text generation request
      await this.client.textGeneration({
        model: 'gpt2',
        inputs: 'test',
        parameters: { max_new_tokens: 1 }
      });
      return true;
    } catch (error) {
      console.error('HuggingFace API connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== 'dummy-key-for-testing';
  }
}

// Export singleton instance
export const huggingFaceClient = new HuggingFaceClient();
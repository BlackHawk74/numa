import { HuggingFaceClient } from '../HuggingFaceClient';

// Mock the HuggingFace inference client
jest.mock('@huggingface/inference', () => ({
  InferenceClient: jest.fn().mockImplementation((apiKey) => ({
    textGeneration: jest.fn(),
    automaticSpeechRecognition: jest.fn(),
    textToSpeech: jest.fn(),
    textClassification: jest.fn(),
    chatCompletion: jest.fn()
  }))
}));

describe('HuggingFaceClient', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create client with provided API key', () => {
      const client = new HuggingFaceClient('test-api-key');
      expect(client.isConfigured()).toBe(true);
    });

    it('should create client with environment variable API key', () => {
      process.env.HUGGINGFACE_API_KEY = 'env-api-key';
      const client = new HuggingFaceClient();
      expect(client.isConfigured()).toBe(true);
    });

    it('should create client with dummy key when no API key is provided', () => {
      delete process.env.HUGGINGFACE_API_KEY;
      const client = new HuggingFaceClient();
      expect(client.isConfigured()).toBe(false);
    });
  });

  describe('testConnection', () => {
    it('should return true when connection test succeeds', async () => {
      const { InferenceClient } = require('@huggingface/inference');
      const mockClient = {
        textGeneration: jest.fn().mockResolvedValue({ generated_text: 'test' })
      };
      InferenceClient.mockImplementation(() => mockClient);

      const client = new HuggingFaceClient('test-api-key');
      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockClient.textGeneration).toHaveBeenCalledWith({
        model: 'gpt2',
        inputs: 'test',
        parameters: { max_new_tokens: 1 }
      });
    });

    it('should return false when connection test fails', async () => {
      // Create a new client instance that will use the mocked methods
      const client = new HuggingFaceClient('test-api-key');
      
      // Mock the client methods directly
      jest.spyOn(client, 'textGeneration').mockRejectedValue(new Error('API Error'));
      jest.spyOn(client, 'chatCompletion').mockRejectedValue(new Error('Chat API Error'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('getClient', () => {
    it('should return the HuggingFace inference client', () => {
      const client = new HuggingFaceClient('test-api-key');
      const hfClient = client.getClient();
      expect(hfClient).toBeDefined();
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is set', () => {
      const client = new HuggingFaceClient('test-api-key');
      expect(client.isConfigured()).toBe(true);
    });

    it('should return false when API key is empty', () => {
      delete process.env.HUGGINGFACE_API_KEY;
      const client = new HuggingFaceClient('');
      expect(client.isConfigured()).toBe(false);
    });
  });
});
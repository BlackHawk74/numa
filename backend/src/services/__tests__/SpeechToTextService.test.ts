import { SpeechToTextService } from '../SpeechToTextService';

// Mock the HuggingFace client
jest.mock('../HuggingFaceClient', () => ({
  huggingFaceClient: {
    getClient: jest.fn(() => ({
      automaticSpeechRecognition: jest.fn()
    }))
  }
}));

describe('SpeechToTextService', () => {
  let service: SpeechToTextService;
  let mockClient: any;

  beforeEach(() => {
    const { huggingFaceClient } = require('../HuggingFaceClient');
    mockClient = huggingFaceClient.getClient();
    service = new SpeechToTextService();
    jest.clearAllMocks();
  });

  describe('transcribeAudio', () => {
    it('should successfully transcribe audio', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024);
      mockClient.automaticSpeechRecognition.mockResolvedValue({
        text: 'Hello, this is a test transcription.'
      });

      const result = await service.transcribeAudio(mockAudioBuffer);

      expect(result.transcription).toBe('Hello, this is a test transcription.');
      expect(result.confidence).toBe(1.0);
      expect(result.error).toBeUndefined();
      expect(mockClient.automaticSpeechRecognition).toHaveBeenCalledWith({
        model: 'openai/whisper-large-v3-turbo',
        data: mockAudioBuffer,
        parameters: { language: 'en' }
      });
    });

    it('should handle empty transcription result', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024);
      mockClient.automaticSpeechRecognition.mockResolvedValue(null);

      const result = await service.transcribeAudio(mockAudioBuffer);

      expect(result.transcription).toBe('');
      expect(result.error).toContain('Speech-to-text failed');
    });

    it('should retry on failure', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024);
      mockClient.automaticSpeechRecognition
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue({ text: 'Success on retry' });

      const result = await service.transcribeAudio(mockAudioBuffer, { maxRetries: 2 });

      expect(result.transcription).toBe('Success on retry');
      expect(mockClient.automaticSpeechRecognition).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024);
      mockClient.automaticSpeechRecognition.mockRejectedValue(new Error('Unauthorized'));

      const result = await service.transcribeAudio(mockAudioBuffer, { maxRetries: 3 });

      expect(result.error).toContain('Speech-to-text failed after 1 attempts: Unauthorized');
      expect(mockClient.automaticSpeechRecognition).toHaveBeenCalledTimes(1);
    });

    it('should use custom language parameter', async () => {
      const mockAudioBuffer = new ArrayBuffer(1024);
      mockClient.automaticSpeechRecognition.mockResolvedValue({ text: 'Bonjour' });

      const result = await service.transcribeAudio(mockAudioBuffer, { language: 'fr' });

      expect(result.transcription).toBe('Bonjour');
      expect(mockClient.automaticSpeechRecognition).toHaveBeenCalledWith({
        model: 'openai/whisper-large-v3-turbo',
        data: mockAudioBuffer,
        parameters: { language: 'fr' }
      });
    });
  });

  describe('validateAudioInput', () => {
    it('should validate correct audio input', () => {
      const audioBuffer = new ArrayBuffer(1024);
      const result = service.validateAudioInput(audioBuffer);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty audio buffer', () => {
      const audioBuffer = new ArrayBuffer(0);
      const result = service.validateAudioInput(audioBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Audio buffer is empty');
    });

    it('should reject oversized audio buffer', () => {
      const audioBuffer = new ArrayBuffer(30 * 1024 * 1024); // 30MB
      const result = service.validateAudioInput(audioBuffer);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Audio file too large');
    });

    it('should validate Blob input', () => {
      const blob = new Blob(['test'], { type: 'audio/wav' });
      const result = service.validateAudioInput(blob);
      expect(result.valid).toBe(true);
    });
  });

  describe('getSupportedFormats', () => {
    it('should return list of supported audio formats', () => {
      const formats = service.getSupportedFormats();
      expect(formats).toContain('wav');
      expect(formats).toContain('mp3');
      expect(formats).toContain('webm');
      expect(Array.isArray(formats)).toBe(true);
    });
  });
});
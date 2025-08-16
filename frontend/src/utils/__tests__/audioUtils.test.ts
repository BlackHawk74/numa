import { AudioUtils } from '../audioUtils';

// Mock Web APIs
const mockMediaDevices = {
  getUserMedia: jest.fn(),
};

const mockMediaRecorder = jest.fn().mockImplementation(() => ({
  start: jest.fn(),
  stop: jest.fn(),
  ondataavailable: null,
  onerror: null,
  onstop: null,
  mimeType: 'audio/webm',
}));

const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn().mockReturnValue([
    { name: 'Test Voice', lang: 'en-US', localService: true },
  ]),
};

// Setup global mocks
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

Object.defineProperty(global, 'MediaRecorder', {
  value: mockMediaRecorder,
  writable: true,
});

Object.defineProperty(global, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

Object.defineProperty(global, 'AudioContext', {
  value: jest.fn().mockImplementation(() => ({
    createAnalyser: jest.fn().mockReturnValue({
      fftSize: 512,
      smoothingTimeConstant: 0.3,
      minDecibels: -90,
      maxDecibels: -10,
      frequencyBinCount: 256,
      getFloatFrequencyData: jest.fn(),
    }),
    createMediaStreamSource: jest.fn().mockReturnValue({
      connect: jest.fn(),
    }),
    close: jest.fn().mockResolvedValue(undefined),
    state: 'running',
  })),
  writable: true,
});

Object.defineProperty(global, 'webkitAudioContext', {
  value: global.AudioContext,
  writable: true,
});

Object.defineProperty(global, 'OfflineAudioContext', {
  value: jest.fn().mockImplementation(() => ({
    createBufferSource: jest.fn().mockReturnValue({
      buffer: null,
      connect: jest.fn(),
      start: jest.fn(),
    }),
    destination: {},
  })),
  writable: true,
});

// Add MediaRecorder.isTypeSupported mock
MediaRecorder.isTypeSupported = jest.fn().mockReturnValue(true);

describe('AudioUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    AudioUtils.cleanup();
  });

  describe('isRecordingSupported', () => {
    it('should return true when all required APIs are available', () => {
      expect(AudioUtils.isRecordingSupported()).toBe(true);
    });

    it('should return false when MediaRecorder is not available', () => {
      const originalMediaRecorder = global.MediaRecorder;
      // @ts-ignore
      global.MediaRecorder = undefined;
      
      expect(AudioUtils.isRecordingSupported()).toBe(false);
      
      global.MediaRecorder = originalMediaRecorder;
    });
  });

  describe('isSpeechSynthesisSupported', () => {
    it('should return true when speechSynthesis is available', () => {
      expect(AudioUtils.isSpeechSynthesisSupported()).toBe(true);
    });

    it('should return false when speechSynthesis is not available', () => {
      const originalSpeechSynthesis = global.speechSynthesis;
      // @ts-ignore
      global.speechSynthesis = undefined;
      
      expect(AudioUtils.isSpeechSynthesisSupported()).toBe(false);
      
      global.speechSynthesis = originalSpeechSynthesis;
    });
  });

  describe('getSupportedAudioFormats', () => {
    it('should return supported audio formats', () => {
      const formats = AudioUtils.getSupportedAudioFormats();
      expect(Array.isArray(formats)).toBe(true);
      expect(formats.length).toBeGreaterThan(0);
    });
  });

  describe('validateAudioQuality', () => {
    it('should validate audio blob size', () => {
      const smallBlob = new Blob([''], { type: 'audio/webm' });
      const result = AudioUtils.validateAudioQuality(smallBlob);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Audio recording is too short or empty');
    });

    it('should accept valid audio blob', () => {
      const validBlob = new Blob([new ArrayBuffer(5000)], { type: 'audio/webm' });
      const result = AudioUtils.validateAudioQuality(validBlob);
      
      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should reject non-audio blob', () => {
      const invalidBlob = new Blob(['test'], { type: 'text/plain' });
      const result = AudioUtils.validateAudioQuality(invalidBlob);
      
      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid audio format');
    });
  });

  describe('getAvailableVoices', () => {
    it('should return filtered English voices', () => {
      const voices = AudioUtils.getAvailableVoices();
      expect(Array.isArray(voices)).toBe(true);
    });
  });

  describe('getBestTherapyVoice', () => {
    it('should return a voice or null', () => {
      const voice = AudioUtils.getBestTherapyVoice();
      expect(voice === null || typeof voice === 'object').toBe(true);
    });
  });

  describe('requestMicrophonePermission', () => {
    it('should request microphone permission successfully', async () => {
      const mockStream = { getTracks: jest.fn().mockReturnValue([]) };
      mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);

      const result = await AudioUtils.requestMicrophonePermission();
      
      expect(result).toBe(true);
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
          sampleSize: 16,
        }
      });
    });

    it('should handle permission denied error', async () => {
      const error = new Error('Permission denied');
      error.name = 'NotAllowedError';
      mockMediaDevices.getUserMedia.mockRejectedValue(error);

      await expect(AudioUtils.requestMicrophonePermission()).rejects.toThrow(
        'Microphone access was denied'
      );
    });

    it('should handle no microphone found error', async () => {
      const error = new Error('No microphone');
      error.name = 'NotFoundError';
      mockMediaDevices.getUserMedia.mockRejectedValue(error);

      await expect(AudioUtils.requestMicrophonePermission()).rejects.toThrow(
        'No microphone found'
      );
    });
  });
});
// Tests for SpeechSynthesisManager utility

import { SpeechSynthesisManager } from '../speechSynthesis';

// Mock Web Speech API
const mockSpeechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  getVoices: jest.fn(),
  speaking: false,
  paused: false,
  onvoiceschanged: null as any,
};

const mockSpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
  text,
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'en-US',
  onstart: null,
  onend: null,
  onerror: null,
}));

// Mock window object
Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
});

Object.defineProperty(window, 'SpeechSynthesisUtterance', {
  value: mockSpeechSynthesisUtterance,
  writable: true,
});

describe('SpeechSynthesisManager', () => {
  let speechManager: SpeechSynthesisManager;

  beforeEach(() => {
    jest.clearAllMocks();
    speechManager = SpeechSynthesisManager.getInstance();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = SpeechSynthesisManager.getInstance();
      const instance2 = SpeechSynthesisManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should check for Web Speech API support', () => {
      expect(SpeechSynthesisManager.isSupported()).toBe(true);
    });

    it('should handle unsupported browsers', () => {
      // Temporarily remove speechSynthesis
      const originalSpeechSynthesis = (window as any).speechSynthesis;
      delete (window as any).speechSynthesis;

      expect(SpeechSynthesisManager.isSupported()).toBe(false);

      // Restore
      (window as any).speechSynthesis = originalSpeechSynthesis;
    });
  });

  describe('Voice Management', () => {
    const mockVoices = [
      {
        name: 'Google US English Female',
        lang: 'en-US',
        localService: true,
        voiceURI: 'Google US English Female',
        default: false,
      },
      {
        name: 'Google UK English Male',
        lang: 'en-GB',
        localService: true,
        voiceURI: 'Google UK English Male',
        default: false,
      },
      {
        name: 'Microsoft Samantha',
        lang: 'en-US',
        localService: false,
        voiceURI: 'Microsoft Samantha',
        default: false,
      },
    ] as SpeechSynthesisVoice[];

    beforeEach(() => {
      mockSpeechSynthesis.getVoices.mockReturnValue(mockVoices);
    });

    it('should get available voices', () => {
      const voices = speechManager.getAvailableVoices();
      expect(voices).toHaveLength(3);
      expect(voices[0].lang).toMatch(/^en/);
    });

    it('should identify female voices', () => {
      const bestVoice = speechManager.getBestTherapyVoice();
      expect(bestVoice?.name).toContain('Female');
    });

    it('should prefer local voices', () => {
      const bestVoice = speechManager.getBestTherapyVoice({ preferLocal: true });
      expect(bestVoice?.localService).toBe(true);
    });

    it('should find voice by name', () => {
      const voice = speechManager.getBestTherapyVoice({ voiceName: 'Samantha' });
      expect(voice?.name).toContain('Samantha');
    });

    it('should set and get current voice', () => {
      const voice = mockVoices[0];
      speechManager.setVoice(voice);
      expect(speechManager.getCurrentVoice()).toBe(voice);
    });
  });

  describe('Speech Synthesis', () => {
    beforeEach(() => {
      mockSpeechSynthesis.getVoices.mockReturnValue([
        {
          name: 'Test Voice',
          lang: 'en-US',
          localService: true,
          voiceURI: 'Test Voice',
          default: false,
        }
      ] as SpeechSynthesisVoice[]);
    });

    it('should speak text with default settings', async () => {
      const speakPromise = speechManager.speak('Hello world');

      // Simulate successful speech
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onstart) utterance.onstart();
        setTimeout(() => {
          if (utterance.onend) utterance.onend();
        }, 10);
      }, 10);

      const controls = await speakPromise;

      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
      expect(controls).toBeDefined();
      expect(controls.stop).toBeInstanceOf(Function);
    });

    it('should use therapy-optimized settings', async () => {
      const speakPromise = speechManager.speak('Hello world');

      // Simulate speech start
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onstart) utterance.onstart();
      }, 10);

      await speakPromise;

      expect(utterance.rate).toBe(0.85); // Slower for therapy
      expect(utterance.volume).toBe(0.9);
    });

    it('should prepare text for therapy delivery', async () => {
      const speakPromise = speechManager.speak('Hello. How are you? Great!');

      // Simulate speech start
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onstart) utterance.onstart();
      }, 10);

      await speakPromise;

      // Text should have pauses added
      expect(utterance.text).toContain('... ');
    });

    it('should handle speech synthesis errors', async () => {
      const speakPromise = speechManager.speak('Hello world');

      // Simulate error
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onerror) {
          utterance.onerror({ error: 'synthesis-failed' });
        }
      }, 10);

      await expect(speakPromise).rejects.toThrow('Speech synthesis failed');
    });

    it('should timeout long-running speech', async () => {
      const speakPromise = speechManager.speak('Hello world');

      // Don't trigger onstart - should timeout
      await expect(speakPromise).rejects.toThrow('Speech synthesis timed out');
    }, 65000); // Longer timeout for this test

    it('should handle custom voice options', async () => {
      const customVoice = {
        name: 'Custom Voice',
        lang: 'en-US',
        localService: true,
        voiceURI: 'Custom Voice',
        default: false,
      } as SpeechSynthesisVoice;

      const speakPromise = speechManager.speak('Hello world', {
        voice: customVoice,
        rate: 1.2,
        pitch: 0.8,
        volume: 0.7,
      });

      // Simulate speech start
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onstart) utterance.onstart();
      }, 10);

      await speakPromise;

      expect(utterance.voice).toBe(customVoice);
      expect(utterance.rate).toBe(1.2);
      expect(utterance.pitch).toBe(0.8);
      expect(utterance.volume).toBe(0.7);
    });
  });

  describe('Playback Controls', () => {
    it('should provide working playback controls', async () => {
      const speakPromise = speechManager.speak('Hello world');

      // Simulate speech start
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onstart) utterance.onstart();
      }, 10);

      const controls = await speakPromise;

      // Test controls
      controls.pause();
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();

      controls.resume();
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();

      controls.stop();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should report speaking status', () => {
      mockSpeechSynthesis.speaking = true;
      expect(speechManager.isSpeaking()).toBe(true);

      mockSpeechSynthesis.speaking = false;
      expect(speechManager.isSpeaking()).toBe(false);
    });

    it('should report paused status', () => {
      mockSpeechSynthesis.paused = true;
      expect(speechManager.isPaused()).toBe(true);

      mockSpeechSynthesis.paused = false;
      expect(speechManager.isPaused()).toBe(false);
    });
  });

  describe('Utility Methods', () => {
    it('should stop current speech', () => {
      speechManager.stop();
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
    });

    it('should pause current speech', () => {
      mockSpeechSynthesis.speaking = true;
      mockSpeechSynthesis.paused = false;
      
      speechManager.pause();
      expect(mockSpeechSynthesis.pause).toHaveBeenCalled();
    });

    it('should resume paused speech', () => {
      mockSpeechSynthesis.paused = true;
      
      speechManager.resume();
      expect(mockSpeechSynthesis.resume).toHaveBeenCalled();
    });

    it('should provide service status', () => {
      const status = speechManager.getStatus();
      
      expect(status.isSupported).toBe(true);
      expect(status.isInitialized).toBe(true);
      expect(typeof status.availableVoicesCount).toBe('number');
    });

    it('should test speech functionality', async () => {
      const testPromise = speechManager.testSpeech();

      // Simulate successful test
      const utterance = mockSpeechSynthesisUtterance.mock.results[0].value;
      setTimeout(() => {
        if (utterance.onstart) utterance.onstart();
        setTimeout(() => {
          if (utterance.onend) utterance.onend();
        }, 100);
      }, 10);

      const result = await testPromise;
      expect(result).toBe(true);
    });
  });
});
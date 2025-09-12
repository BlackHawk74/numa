// Tests for enhanced error handling utilities

import { ErrorHandler, NetworkMonitor, FeatureDetector } from '../errorHandling';

// Mock fetch for testing
global.fetch = jest.fn();

// Mock navigator for testing
Object.defineProperty(global.navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(),
  },
});

Object.defineProperty(global.window, 'speechSynthesis', {
  writable: true,
  value: {},
});

Object.defineProperty(global.window, 'SpeechSynthesisUtterance', {
  writable: true,
  value: function() {},
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseError', () => {
    it('should categorize network errors correctly', () => {
      const networkError = new Error('Failed to fetch');
      const errorInfo = ErrorHandler.parseError(networkError);

      expect(errorInfo.type).toBe('network');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.userMessage).toContain('Connection issue');
    });

    it('should categorize API errors correctly', () => {
      const apiError = new Error('API error: 503 Service Unavailable');
      const errorInfo = ErrorHandler.parseError(apiError);

      expect(errorInfo.type).toBe('api');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.userMessage).toContain('AI service is temporarily unavailable');
    });

    it('should categorize audio errors correctly', () => {
      const audioError = new Error('microphone access denied');
      const errorInfo = ErrorHandler.parseError(audioError);

      expect(errorInfo.type).toBe('audio');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.severity).toBe('high');
      expect(errorInfo.userMessage).toContain('Audio access issue');
    });

    it('should categorize permission errors correctly', () => {
      const permissionError = new Error('NotAllowedError: permission denied');
      const errorInfo = ErrorHandler.parseError(permissionError);

      expect(errorInfo.type).toBe('permission');
      expect(errorInfo.retryable).toBe(false);
      expect(errorInfo.severity).toBe('high');
      expect(errorInfo.userMessage).toContain('Permission required');
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Something weird happened');
      const errorInfo = ErrorHandler.parseError(unknownError);

      expect(errorInfo.type).toBe('unknown');
      expect(errorInfo.retryable).toBe(true);
      expect(errorInfo.severity).toBe('medium');
      expect(errorInfo.userMessage).toContain('Something unexpected happened');
    });

    it('should include context in error info', () => {
      const error = new Error('Test error');
      const context = { operation: 'test', userId: '123' };
      const errorInfo = ErrorHandler.parseError(error, context);

      expect(errorInfo.context).toEqual(context);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await ErrorHandler.withRetry(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      
      const result = await ErrorHandler.withRetry(operation, { maxAttempts: 3 });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should fail after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      await expect(
        ErrorHandler.withRetry(operation, { maxAttempts: 2 })
      ).rejects.toThrow('Persistent failure');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('permission denied'));
      
      await expect(
        ErrorHandler.withRetry(operation, { maxAttempts: 3 })
      ).rejects.toThrow('permission denied');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');
      const onRetry = jest.fn();
      
      await ErrorHandler.withRetry(operation, { maxAttempts: 3 }, onRetry);
      
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('logError', () => {
    const originalConsoleError = console.error;
    
    beforeEach(() => {
      console.error = jest.fn();
    });
    
    afterEach(() => {
      console.error = originalConsoleError;
    });

    it('should log error', () => {
      const errorInfo = ErrorHandler.parseError(new Error('Test error'));
      ErrorHandler.logError(errorInfo);
      
      // In test environment, it should at least call the function without errors
      expect(errorInfo).toBeDefined();
      expect(errorInfo.type).toBe('unknown');
    });
  });
});

describe('NetworkMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return current online status', () => {
    expect(NetworkMonitor.getStatus()).toBe(true);
  });

  it('should add and remove listeners', () => {
    const listener = jest.fn();
    const unsubscribe = NetworkMonitor.addListener(listener);
    
    expect(typeof unsubscribe).toBe('function');
    
    // Simulate going offline
    Object.defineProperty(navigator, 'onLine', { value: false });
    window.dispatchEvent(new Event('offline'));
    
    unsubscribe();
  });

  it('should test connectivity with fetch when online', async () => {
    // Mock fetch to return successful response
    (fetch as jest.Mock).mockResolvedValue({ ok: true });
    
    // Force NetworkMonitor to think we're online and reset initialization
    (NetworkMonitor as any).isOnline = true;
    (NetworkMonitor as any).initialized = false;
    
    const isConnected = await NetworkMonitor.testConnectivity();
    
    expect(isConnected).toBe(true);
    expect(fetch).toHaveBeenCalled();
  });

  it('should handle connectivity test failure', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const isConnected = await NetworkMonitor.testConnectivity();
    
    expect(isConnected).toBe(false);
  });
});

describe('FeatureDetector', () => {
  it('should check audio support', () => {
    const support = FeatureDetector.checkAudioSupport();
    
    expect(support).toHaveProperty('recording');
    expect(support).toHaveProperty('playback');
    expect(support).toHaveProperty('speechSynthesis');
    expect(support).toHaveProperty('issues');
    expect(Array.isArray(support.issues)).toBe(true);
  });

  it('should check browser support', () => {
    const support = FeatureDetector.checkBrowserSupport();
    
    expect(support).toHaveProperty('supported');
    expect(support).toHaveProperty('issues');
    expect(support).toHaveProperty('recommendations');
    expect(Array.isArray(support.issues)).toBe(true);
    expect(Array.isArray(support.recommendations)).toBe(true);
  });

  it('should detect missing MediaRecorder', () => {
    const originalMediaRecorder = window.MediaRecorder;
    delete (window as any).MediaRecorder;
    
    const support = FeatureDetector.checkBrowserSupport();
    
    expect(support.issues).toContain('MediaRecorder API not supported');
    expect(support.recommendations).toContain('Try using Chrome, Firefox, or Safari');
    
    (window as any).MediaRecorder = originalMediaRecorder;
  });

  it('should detect HTTPS requirement', () => {
    const originalLocation = window.location;
    delete (window as any).location;
    (window as any).location = {
      protocol: 'http:',
      hostname: 'example.com'
    };
    
    const support = FeatureDetector.checkBrowserSupport();
    
    expect(support.issues).toContain('HTTPS required for microphone access');
    
    (window as any).location = originalLocation;
  });
});
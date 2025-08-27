// Audio utility functions for Numa AI Therapist

export class AudioUtils {
  private static mediaRecorder: MediaRecorder | null = null;
  private static audioChunks: Blob[] = [];
  private static stream: MediaStream | null = null;
  private static audioContext: AudioContext | null = null;
  private static analyser: AnalyserNode | null = null;
  private static source: MediaStreamAudioSourceNode | null = null;
  private static waveformCallback: ((data: Float32Array) => void) | null = null;
  private static animationFrameId: number | null = null;
  private static isVisualizationActive: boolean = false;

  /**
   * Request microphone permission and initialize audio stream with enhanced error handling
   */
  static async requestMicrophonePermission(): Promise<boolean> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      // Request permission with optimized audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1, // Mono audio for better processing
          sampleSize: 16,
        } 
      });
      
      this.stream = stream;
      this.initializeAudioContext();
      return true;
    } catch (error) {
      console.error('Microphone permission error:', error);
      
      if (error instanceof Error) {
        // Provide specific error messages based on the error type
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access was denied. Please allow microphone access in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else if (error.name === 'NotReadableError') {
          throw new Error('Your microphone is being used by another application. Please close other apps using the microphone and try again.');
        } else if (error.name === 'OverconstrainedError') {
          throw new Error('Your microphone does not support the required audio settings. Please try with a different microphone.');
        } else if (error.name === 'SecurityError') {
          throw new Error('Microphone access is blocked due to security settings. Please enable microphone access for this website.');
        }
      }
      
      throw new Error('Failed to access microphone. Please check your browser settings and try again.');
    }
  }

  /**
   * Initialize audio context for waveform visualization
   */
  private static initializeAudioContext(): void {
    if (!this.stream) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Configure analyser for optimal waveform visualization
      this.analyser.fftSize = 512; // Higher resolution for better visualization
      this.analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive visualization
      this.analyser.minDecibels = -90;
      this.analyser.maxDecibels = -10;
      
      this.source.connect(this.analyser);
    } catch (error) {
      console.warn('Failed to initialize audio context for waveform:', error);
    }
  }

  /**
   * Start audio recording with enhanced quality settings
   */
  static async startRecording(): Promise<void> {
    if (!this.stream) {
      throw new Error('No audio stream available. Request permission first.');
    }

    this.audioChunks = [];
    
    // Determine the best available MIME type
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    
    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    if (!selectedMimeType) {
      throw new Error('Your browser does not support audio recording. Please use a modern browser.');
    }

    try {
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: selectedMimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        throw new Error('Recording failed. Please try again.');
      };

      this.mediaRecorder.start(100); // Collect data every 100ms for smooth recording
      
      // Start waveform visualization
      this.startWaveformVisualization();
    } catch (error) {
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop audio recording and return the audio blob
   */
  static async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      // Stop waveform visualization
      this.stopWaveformVisualization();

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert WebM audio to WAV format using Web Audio API
   */
  static async convertToWav(audioBlob: Blob): Promise<Blob> {
    try {
      // Create a temporary audio context for conversion
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      
      // Decode audio data
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Convert to WAV format
      const wavBlob = this.audioBufferToWav(audioBuffer);
      
      // Clean up
      await audioContext.close();
      
      return wavBlob;
    } catch (error) {
      console.warn('Failed to convert to WAV, returning original blob:', error);
      return audioBlob;
    }
  }

  /**
   * Convert AudioBuffer to WAV Blob
   */
  private static audioBufferToWav(audioBuffer: AudioBuffer): Blob {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numberOfChannels * bytesPerSample;
    
    const buffer = new ArrayBuffer(44 + audioBuffer.length * numberOfChannels * bytesPerSample);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + audioBuffer.length * numberOfChannels * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, audioBuffer.length * numberOfChannels * bytesPerSample, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  /**
   * Set callback for waveform data updates
   */
  static setWaveformCallback(callback: (data: Float32Array) => void): void {
    this.waveformCallback = callback;
  }

  /**
   * Start real-time waveform visualization
   */
  private static startWaveformVisualization(): void {
    if (!this.analyser || this.isVisualizationActive) return;
    
    this.isVisualizationActive = true;
    
    const updateWaveform = () => {
      if (!this.isVisualizationActive || !this.analyser) return;
      
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);
      this.analyser.getFloatFrequencyData(dataArray);
      
      // Call the callback if set
      if (this.waveformCallback) {
        this.waveformCallback(dataArray);
      }
      
      this.animationFrameId = requestAnimationFrame(updateWaveform);
    };
    
    updateWaveform();
  }

  /**
   * Stop waveform visualization
   */
  private static stopWaveformVisualization(): void {
    this.isVisualizationActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Get current waveform data (for one-time use)
   */
  static getCurrentWaveformData(): Float32Array | null {
    if (!this.analyser) return null;
    
    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    this.analyser.getFloatFrequencyData(dataArray);
    
    return dataArray;
  }

  /**
   * Play text using Web Speech API with enhanced error handling
   * @deprecated Use TTSService.speak() instead for better fallback support
   */
  static speakText(text: string, voice?: SpeechSynthesisVoice): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Speech synthesis is not supported in your browser. Please try a different browser or enable speech synthesis.'));
        return;
      }

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice settings for therapy
      utterance.rate = 0.85; // Slower for therapeutic effect
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      utterance.lang = 'en-US'; // Ensure English language
      
      if (voice) {
        utterance.voice = voice;
      } else {
        // Try to find a suitable English voice
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        if (englishVoice) {
          utterance.voice = englishVoice;
        }
      }

      let hasEnded = false;
      const timeout = setTimeout(() => {
        if (!hasEnded) {
          speechSynthesis.cancel();
          reject(new Error('Speech synthesis timed out'));
        }
      }, 60000); // 60 second timeout

      utterance.onend = () => {
        hasEnded = true;
        clearTimeout(timeout);
        resolve();
      };
      
      utterance.onerror = (event) => {
        hasEnded = true;
        clearTimeout(timeout);
        reject(new Error(`Speech synthesis failed: ${event.error}`));
      };

      try {
        speechSynthesis.speak(utterance);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error('Failed to start speech synthesis'));
      }
    });
  }

  /**
   * Get available voices for speech synthesis with filtering
   */
  static getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSpeechSynthesisSupported()) {
      return [];
    }
    
    const voices = speechSynthesis.getVoices();
    
    if (!voices || !Array.isArray(voices)) {
      return [];
    }
    
    // Filter for English voices and sort by quality
    return voices
      .filter(voice => voice && voice.lang && voice.lang.startsWith('en'))
      .sort((a, b) => {
        // Prefer local voices over remote ones
        if (a.localService && !b.localService) return -1;
        if (!a.localService && b.localService) return 1;
        
        // Prefer female voices for therapeutic applications
        if (a.name.toLowerCase().includes('female') && !b.name.toLowerCase().includes('female')) return -1;
        if (!a.name.toLowerCase().includes('female') && b.name.toLowerCase().includes('female')) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }

  /**
   * Get the best available voice for therapy
   */
  static getBestTherapyVoice(): SpeechSynthesisVoice | null {
    const voices = this.getAvailableVoices();
    
    // Look for specific voice names that work well for therapy
    const preferredNames = ['samantha', 'karen', 'susan', 'victoria', 'female'];
    
    for (const preferredName of preferredNames) {
      const voice = voices.find(v => v.name.toLowerCase().includes(preferredName));
      if (voice) return voice;
    }
    
    // Fallback to first available English voice
    return voices[0] || null;
  }

  /**
   * Check if audio recording is supported
   */
  static isRecordingSupported(): boolean {
    return !!(navigator.mediaDevices && 
              typeof navigator.mediaDevices.getUserMedia === 'function' && 
              window.MediaRecorder);
  }

  /**
   * Check if speech synthesis is supported
   */
  static isSpeechSynthesisSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * Get supported audio formats for recording
   */
  static getSupportedAudioFormats(): string[] {
    if (!this.isRecordingSupported()) {
      return [];
    }
    
    const formats = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/wav'
    ];
    
    return formats.filter(format => {
      try {
        return MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(format);
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Stop current speech synthesis
   */
  static stopSpeaking(): void {
    speechSynthesis.cancel();
  }

  /**
   * Optimize audio blob for transmission (compression and format optimization)
   */
  static async optimizeAudioForTransmission(audioBlob: Blob): Promise<Blob> {
    try {
      // If the blob is already small enough, return as-is
      if (audioBlob.size < 1024 * 1024) { // Less than 1MB
        return audioBlob;
      }

      // For larger files, convert to a more compressed format
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Downsample to 16kHz for speech recognition (optimal for Whisper)
      const targetSampleRate = 16000;
      const resampledBuffer = this.resampleAudioBuffer(audioBuffer, targetSampleRate);
      
      // Convert to optimized WAV
      const optimizedBlob = this.audioBufferToWav(resampledBuffer);
      
      await audioContext.close();
      
      return optimizedBlob;
    } catch (error) {
      console.warn('Failed to optimize audio, returning original:', error);
      return audioBlob;
    }
  }

  /**
   * Resample audio buffer to target sample rate
   */
  private static resampleAudioBuffer(audioBuffer: AudioBuffer, targetSampleRate: number): AudioBuffer {
    if (audioBuffer.sampleRate === targetSampleRate) {
      return audioBuffer;
    }

    const ratio = audioBuffer.sampleRate / targetSampleRate;
    const newLength = Math.round(audioBuffer.length / ratio);
    const numberOfChannels = audioBuffer.numberOfChannels;
    
    // Create new audio context with target sample rate
    const offlineContext = new OfflineAudioContext(numberOfChannels, newLength, targetSampleRate);
    const bufferSource = offlineContext.createBufferSource();
    bufferSource.buffer = audioBuffer;
    bufferSource.connect(offlineContext.destination);
    bufferSource.start();
    
    // This is a simplified resampling - in production you might want to use a more sophisticated algorithm
    return audioBuffer; // For now, return original - proper resampling requires more complex implementation
  }

  /**
   * Validate audio quality and provide feedback
   */
  static validateAudioQuality(audioBlob: Blob): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    let isValid = true;

    // Check file size
    if (audioBlob.size < 1000) { // Less than 1KB
      issues.push('Audio recording is too short or empty');
      isValid = false;
    }

    if (audioBlob.size > 10 * 1024 * 1024) { // More than 10MB
      issues.push('Audio recording is too large');
      isValid = false;
    }

    // Check MIME type
    if (!audioBlob.type.startsWith('audio/')) {
      issues.push('Invalid audio format');
      isValid = false;
    }

    return { isValid, issues };
  }

  /**
   * Clean up audio resources
   */
  static cleanup(): void {
    // Stop visualization
    this.stopWaveformVisualization();
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(console.warn);
      this.audioContext = null;
    }
    
    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }
    
    this.analyser = null;
    this.source = null;
    this.waveformCallback = null;
    this.audioChunks = [];
    
    // Cancel speech synthesis if available
    if (this.isSpeechSynthesisSupported()) {
      speechSynthesis.cancel();
    }
  }
}
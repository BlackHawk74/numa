// Core data types for Numa AI Therapist

export interface User {
  id: string;
  name?: string;
  preferences?: Record<string, any>;
  created_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  date: string;
  transcript?: string;
  summary?: string;
  emotion?: string;
  duration_minutes?: number;
  status: 'active' | 'completed' | 'paused';
}

export interface Goal {
  id: string;
  user_id: string;
  description: string;
  created_at: string;
  status: 'active' | 'completed' | 'cancelled';
  target_date?: string;
  progress_notes?: string[];
}

export interface Message {
  id: string;
  speaker: 'user' | 'numa' | 'system';
  content: string;
  timestamp: Date;
  emotion?: string;
  confidence?: number;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface AudioState {
  isRecording: boolean;
  isPlaying: boolean;
  hasPermission: boolean;
  error?: string;
  isInitialized?: boolean;
  supportedFormats?: string[];
  currentVoice?: SpeechSynthesisVoice;
  ttsControls?: SpeechPlaybackControls;
}

export interface SpeechPlaybackControls {
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPaused: boolean;
  isSpeaking: boolean;
}

export interface ConversationState {
  messages: Message[];
  currentSession?: Session;
  isProcessing: boolean;
  error?: string;
}

export interface AppState {
  user?: User;
  audioState: AudioState;
  conversationState: ConversationState;
  currentSession?: Session;
  goals: Goal[];
  globalError?: import('../utils/errorHandling').ErrorInfo;
  isOnline: boolean;
  retryState?: {
    operation: string;
    attempt: number;
    maxAttempts: number;
  };
}

// API Response types
export interface STTResponse {
  transcription: string;
  confidence: number;
}

export interface TherapyResponse {
  response: string;
  emotion: string;
  goal?: string;
  sessionId?: string;
  emotionConfidence?: number;
  shouldConcludeSession?: boolean;
}

export interface TTSResponse {
  audioUrl?: string;
  error?: string;
}
// Message model interface and types for conversation handling

export interface Message {
  id: string;
  speaker: MessageSpeaker;
  content: string;
  timestamp: Date;
  emotion?: string;
  confidence?: number;
  session_id?: string;
}

export type MessageSpeaker = 'user' | 'numa';

export interface CreateMessageRequest {
  speaker: MessageSpeaker;
  content: string;
  emotion?: string;
  confidence?: number;
  session_id?: string;
}

export interface ConversationContext {
  messages: Message[];
  session_id?: string;
  user_id: string;
  current_emotion?: string;
}

export interface TherapyResponse {
  response: string;
  emotion?: string;
  goal?: string;
  confidence?: number;
}

// For real-time conversation display
export interface ConversationState {
  messages: Message[];
  isProcessing: boolean;
  currentEmotion?: string;
  sessionId?: string;
}
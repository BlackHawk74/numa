// Utility functions for data transformation and serialization

import { 
  User, 
  UserRow, 
  UserPreferences
} from './User';
import { 
  Session, 
  SessionRow, 
  SessionSummary,
  EmotionType,
  SessionStatus
} from './Session';
import { 
  Goal, 
  GoalRow,
  GoalStatus
} from './Goal';
import { 
  Message, 
  CreateMessageRequest, 
  ConversationContext 
} from './Message';

// User transformation utilities
export const transformUserRowToUser = (row: UserRow): User => {
  return {
    id: row.id,
    name: row.name || undefined,
    created_at: new Date(row.created_at),
    preferences: transformRawPreferencesToUserPreferences(row.preferences),
    updated_at: new Date(row.updated_at)
  };
};

export const transformUserToUserRow = (user: User): Omit<UserRow, 'created_at' | 'updated_at'> => {
  return {
    id: user.id,
    name: user.name || null,
    preferences: user.preferences as Record<string, any>
  };
};

export const transformRawPreferencesToUserPreferences = (raw: Record<string, any>): UserPreferences => {
  const preferences: UserPreferences = {};
  
  if (raw.voice_settings) {
    preferences.voice_settings = raw.voice_settings;
  }
  
  if (raw.therapy_settings) {
    preferences.therapy_settings = raw.therapy_settings;
  }
  
  if (raw.privacy_settings) {
    preferences.privacy_settings = raw.privacy_settings;
  }
  
  return preferences;
};

export const createDefaultUserPreferences = (): UserPreferences => {
  return {
    voice_settings: {
      preferred_voice: 'default',
      speech_rate: 1.0,
      volume: 0.8
    },
    therapy_settings: {
      session_reminder: true,
      goal_tracking: true,
      emotion_tracking: true
    },
    privacy_settings: {
      data_retention_days: 90,
      analytics_enabled: true
    }
  };
};

// Session transformation utilities
export const transformSessionRowToSession = (row: SessionRow): Session => {
  return {
    id: row.id,
    user_id: row.user_id,
    date: new Date(row.date),
    transcript: row.transcript || undefined,
    summary: row.summary || undefined,
    emotion: (row.emotion as EmotionType) || undefined,
    duration_minutes: row.duration_minutes || undefined,
    status: row.status as SessionStatus,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at)
  };
};

export const transformSessionToSessionRow = (session: Session): Omit<SessionRow, 'created_at' | 'updated_at'> => {
  return {
    id: session.id,
    user_id: session.user_id,
    date: session.date.toISOString(),
    transcript: session.transcript || null,
    summary: session.summary || null,
    emotion: session.emotion || null,
    duration_minutes: session.duration_minutes || null,
    status: session.status
  };
};

export const transformSessionToSessionSummary = (session: Session): SessionSummary => {
  return {
    id: session.id,
    date: session.date,
    summary: session.summary,
    emotion: session.emotion,
    duration_minutes: session.duration_minutes,
    status: session.status
  };
};

// Goal transformation utilities
export const transformGoalRowToGoal = (row: GoalRow): Goal => {
  return {
    id: row.id,
    user_id: row.user_id,
    description: row.description,
    created_at: new Date(row.created_at),
    status: row.status as GoalStatus,
    target_date: row.target_date ? new Date(row.target_date) : undefined,
    progress_notes: row.progress_notes || [],
    updated_at: new Date(row.updated_at)
  };
};

export const transformGoalToGoalRow = (goal: Goal): Omit<GoalRow, 'created_at' | 'updated_at'> => {
  return {
    id: goal.id,
    user_id: goal.user_id,
    description: goal.description,
    status: goal.status,
    target_date: goal.target_date ? goal.target_date.toISOString().split('T')[0] : null,
    progress_notes: goal.progress_notes
  };
};

// Message utilities
export const createMessage = (request: CreateMessageRequest): Message => {
  return {
    id: generateMessageId(),
    speaker: request.speaker,
    content: request.content,
    timestamp: new Date(),
    emotion: request.emotion,
    confidence: request.confidence,
    session_id: request.session_id
  };
};

export const generateMessageId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

// Conversation utilities
export const createConversationContext = (
  messages: Message[], 
  userId: string, 
  sessionId?: string
): ConversationContext => {
  // Find the latest user message with emotion
  const latestUserMessage = messages
    .slice()
    .reverse()
    .find(msg => msg.speaker === 'user' && msg.emotion);
    
  return {
    messages,
    session_id: sessionId,
    user_id: userId,
    current_emotion: latestUserMessage?.emotion
  };
};

export const formatConversationForAI = (context: ConversationContext): string => {
  const formattedMessages = context.messages
    .slice(-10) // Keep last 10 messages for context
    .map(msg => `${msg.speaker.toUpperCase()}: ${msg.content}`)
    .join('\n');
  
  return formattedMessages;
};

// Date utilities
export const formatDateForDisplay = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const isDateInPast = (date: Date): boolean => {
  return date < new Date();
};

export const daysBetween = (date1: Date, date2: Date): number => {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Serialization utilities
export const serializeForJSON = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj, (_key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
};

export const deserializeFromJSON = (obj: any): any => {
  return JSON.parse(JSON.stringify(obj), (_key, value) => {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value);
    }
    return value;
  });
};

// Error handling utilities
export const createValidationError = (field: string, message: string): Error => {
  const error = new Error(`Validation error for ${field}: ${message}`);
  error.name = 'ValidationError';
  return error;
};

export const createNotFoundError = (resource: string, id: string): Error => {
  const error = new Error(`${resource} with id ${id} not found`);
  error.name = 'NotFoundError';
  return error;
};

// Data sanitization utilities
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/\s+/g, ' ');
};

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

export const sanitizeUserInput = (input: string): string => {
  return sanitizeString(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/[<>]/g, ''); // Remove angle brackets
};
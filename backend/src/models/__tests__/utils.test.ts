// Unit tests for data transformation and utility functions

import {
  transformUserRowToUser,
  transformUserToUserRow,
  transformRawPreferencesToUserPreferences,
  createDefaultUserPreferences,
  transformSessionRowToSession,
  transformSessionToSessionRow,
  transformSessionToSessionSummary,
  transformGoalRowToGoal,
  transformGoalToGoalRow,
  createMessage,
  generateMessageId,
  createConversationContext,
  formatConversationForAI,
  formatDateForDisplay,
  isDateInPast,
  daysBetween,
  serializeForJSON,
  deserializeFromJSON,
  createValidationError,
  createNotFoundError,
  sanitizeString,
  truncateString,
  sanitizeUserInput
} from '../utils';

import { UserRow, User } from '../User';
import { SessionRow, Session } from '../Session';
import { GoalRow, Goal } from '../Goal';
import { Message, CreateMessageRequest } from '../Message';

describe('User transformation utilities', () => {
  const mockUserRow: UserRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'John Doe',
    created_at: '2023-01-01T00:00:00.000Z',
    preferences: {
      voice_settings: { preferred_voice: 'default' },
      therapy_settings: { session_reminder: true }
    },
    updated_at: '2023-01-01T00:00:00.000Z'
  };

  describe('transformUserRowToUser', () => {
    it('should transform user row to user object', () => {
      const user = transformUserRowToUser(mockUserRow);
      
      expect(user.id).toBe(mockUserRow.id);
      expect(user.name).toBe(mockUserRow.name);
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.preferences).toEqual(mockUserRow.preferences);
      expect(user.updated_at).toBeInstanceOf(Date);
    });

    it('should handle null name', () => {
      const rowWithNullName = { ...mockUserRow, name: null };
      const user = transformUserRowToUser(rowWithNullName);
      
      expect(user.name).toBeUndefined();
    });
  });

  describe('transformUserToUserRow', () => {
    it('should transform user object to user row', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        created_at: new Date('2023-01-01'),
        preferences: { voice_settings: { preferred_voice: 'default' } },
        updated_at: new Date('2023-01-01')
      };

      const row = transformUserToUserRow(user);
      
      expect(row.id).toBe(user.id);
      expect(row.name).toBe(user.name);
      expect(row.preferences).toEqual(user.preferences);
    });

    it('should handle undefined name', () => {
      const user: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        created_at: new Date('2023-01-01'),
        preferences: {},
        updated_at: new Date('2023-01-01')
      };

      const row = transformUserToUserRow(user);
      expect(row.name).toBeNull();
    });
  });

  describe('createDefaultUserPreferences', () => {
    it('should create default preferences with all sections', () => {
      const preferences = createDefaultUserPreferences();
      
      expect(preferences.voice_settings).toBeDefined();
      expect(preferences.therapy_settings).toBeDefined();
      expect(preferences.privacy_settings).toBeDefined();
      
      expect(preferences.voice_settings?.preferred_voice).toBe('default');
      expect(preferences.therapy_settings?.session_reminder).toBe(true);
      expect(preferences.privacy_settings?.data_retention_days).toBe(90);
    });
  });
});

describe('Session transformation utilities', () => {
  const mockSessionRow: SessionRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '456e7890-e89b-12d3-a456-426614174000',
    date: '2023-01-01T10:00:00.000Z',
    transcript: 'Hello, how are you?',
    summary: 'Initial session',
    emotion: 'neutral',
    duration_minutes: 30,
    status: 'completed',
    created_at: '2023-01-01T10:00:00.000Z',
    updated_at: '2023-01-01T10:30:00.000Z'
  };

  describe('transformSessionRowToSession', () => {
    it('should transform session row to session object', () => {
      const session = transformSessionRowToSession(mockSessionRow);
      
      expect(session.id).toBe(mockSessionRow.id);
      expect(session.user_id).toBe(mockSessionRow.user_id);
      expect(session.date).toBeInstanceOf(Date);
      expect(session.transcript).toBe(mockSessionRow.transcript);
      expect(session.emotion).toBe(mockSessionRow.emotion);
      expect(session.status).toBe(mockSessionRow.status);
    });

    it('should handle null values', () => {
      const rowWithNulls = {
        ...mockSessionRow,
        transcript: null,
        summary: null,
        emotion: null,
        duration_minutes: null
      };
      
      const session = transformSessionRowToSession(rowWithNulls);
      
      expect(session.transcript).toBeUndefined();
      expect(session.summary).toBeUndefined();
      expect(session.emotion).toBeUndefined();
      expect(session.duration_minutes).toBeUndefined();
    });
  });

  describe('transformSessionToSessionSummary', () => {
    it('should create session summary from session', () => {
      const session: Session = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e89b-12d3-a456-426614174000',
        date: new Date('2023-01-01T10:00:00.000Z'),
        transcript: 'Full transcript',
        summary: 'Session summary',
        emotion: 'happy',
        duration_minutes: 45,
        status: 'completed',
        created_at: new Date('2023-01-01T10:00:00.000Z'),
        updated_at: new Date('2023-01-01T10:45:00.000Z')
      };

      const summary = transformSessionToSessionSummary(session);
      
      expect(summary.id).toBe(session.id);
      expect(summary.date).toBe(session.date);
      expect(summary.summary).toBe(session.summary);
      expect(summary.emotion).toBe(session.emotion);
      expect(summary.duration_minutes).toBe(session.duration_minutes);
      expect(summary.status).toBe(session.status);
      
      // Should not include transcript or user_id
      expect('transcript' in summary).toBe(false);
      expect('user_id' in summary).toBe(false);
    });
  });
});

describe('Goal transformation utilities', () => {
  const mockGoalRow: GoalRow = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    user_id: '456e7890-e89b-12d3-a456-426614174000',
    description: 'Practice mindfulness daily',
    created_at: '2023-01-01T00:00:00.000Z',
    status: 'active',
    target_date: '2023-12-31',
    progress_notes: ['Started today', 'Making progress'],
    updated_at: '2023-01-01T00:00:00.000Z'
  };

  describe('transformGoalRowToGoal', () => {
    it('should transform goal row to goal object', () => {
      const goal = transformGoalRowToGoal(mockGoalRow);
      
      expect(goal.id).toBe(mockGoalRow.id);
      expect(goal.user_id).toBe(mockGoalRow.user_id);
      expect(goal.description).toBe(mockGoalRow.description);
      expect(goal.created_at).toBeInstanceOf(Date);
      expect(goal.status).toBe(mockGoalRow.status);
      expect(goal.target_date).toBeInstanceOf(Date);
      expect(goal.progress_notes).toEqual(mockGoalRow.progress_notes);
    });

    it('should handle null target_date', () => {
      const rowWithNullDate = { ...mockGoalRow, target_date: null };
      const goal = transformGoalRowToGoal(rowWithNullDate);
      
      expect(goal.target_date).toBeUndefined();
    });
  });

  describe('transformGoalToGoalRow', () => {
    it('should transform goal object to goal row', () => {
      const goal: Goal = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        user_id: '456e7890-e89b-12d3-a456-426614174000',
        description: 'Practice mindfulness daily',
        created_at: new Date('2023-01-01'),
        status: 'active',
        target_date: new Date('2023-12-31'),
        progress_notes: ['Started today'],
        updated_at: new Date('2023-01-01')
      };

      const row = transformGoalToGoalRow(goal);
      
      expect(row.id).toBe(goal.id);
      expect(row.user_id).toBe(goal.user_id);
      expect(row.description).toBe(goal.description);
      expect(row.status).toBe(goal.status);
      expect(row.target_date).toBe('2023-12-31');
      expect(row.progress_notes).toEqual(goal.progress_notes);
    });
  });
});

describe('Message utilities', () => {
  describe('createMessage', () => {
    it('should create message from request', () => {
      const request: CreateMessageRequest = {
        speaker: 'user',
        content: 'Hello, I need help',
        emotion: 'anxious',
        confidence: 0.8,
        session_id: '123e4567-e89b-12d3-a456-426614174000'
      };

      const message = createMessage(request);
      
      expect(message.id).toBeDefined();
      expect(message.speaker).toBe(request.speaker);
      expect(message.content).toBe(request.content);
      expect(message.emotion).toBe(request.emotion);
      expect(message.confidence).toBe(request.confidence);
      expect(message.session_id).toBe(request.session_id);
      expect(message.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('generateMessageId', () => {
    it('should generate unique message IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^msg_\d+_[a-z0-9]+$/);
    });
  });

  describe('createConversationContext', () => {
    it('should create conversation context', () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          speaker: 'user',
          content: 'Hello',
          timestamp: new Date(),
          emotion: 'neutral'
        },
        {
          id: 'msg2',
          speaker: 'numa',
          content: 'Hi there!',
          timestamp: new Date()
        }
      ];

      const context = createConversationContext(messages, 'user123', 'session123');
      
      expect(context.messages).toBe(messages);
      expect(context.user_id).toBe('user123');
      expect(context.session_id).toBe('session123');
      expect(context.current_emotion).toBe('neutral');
    });
  });

  describe('formatConversationForAI', () => {
    it('should format conversation for AI processing', () => {
      const messages: Message[] = [
        {
          id: 'msg1',
          speaker: 'user',
          content: 'I feel anxious',
          timestamp: new Date()
        },
        {
          id: 'msg2',
          speaker: 'numa',
          content: 'Tell me more about that',
          timestamp: new Date()
        }
      ];

      const context = createConversationContext(messages, 'user123');
      const formatted = formatConversationForAI(context);
      
      expect(formatted).toContain('USER: I feel anxious');
      expect(formatted).toContain('NUMA: Tell me more about that');
    });

    it('should limit to last 10 messages', () => {
      const messages: Message[] = Array.from({ length: 15 }, (_, i) => ({
        id: `msg${i}`,
        speaker: i % 2 === 0 ? 'user' : 'numa',
        content: `Message ${i}`,
        timestamp: new Date()
      }));

      const context = createConversationContext(messages, 'user123');
      const formatted = formatConversationForAI(context);
      
      const lines = formatted.split('\n');
      expect(lines.length).toBe(10);
      expect(formatted).toContain('Message 14');
      expect(formatted).not.toContain('Message 4');
    });
  });
});

describe('Date utilities', () => {
  describe('formatDateForDisplay', () => {
    it('should format date for display', () => {
      const date = new Date('2023-01-15T14:30:00.000Z');
      const formatted = formatDateForDisplay(date);
      
      expect(formatted).toMatch(/January 15, 2023/);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('isDateInPast', () => {
    it('should identify past dates', () => {
      const pastDate = new Date('2020-01-01');
      const futureDate = new Date('2030-01-01');
      
      expect(isDateInPast(pastDate)).toBe(true);
      expect(isDateInPast(futureDate)).toBe(false);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date('2023-01-01');
      const date2 = new Date('2023-01-05');
      
      expect(daysBetween(date1, date2)).toBe(4);
      expect(daysBetween(date2, date1)).toBe(4);
    });
  });
});

describe('Serialization utilities', () => {
  describe('serializeForJSON', () => {
    it('should serialize dates to ISO strings', () => {
      const obj = {
        name: 'test',
        date: new Date('2023-01-01T00:00:00.000Z'),
        nested: {
          anotherDate: new Date('2023-01-02T00:00:00.000Z')
        }
      };

      const serialized = serializeForJSON(obj);
      
      expect(serialized.date).toBe('2023-01-01T00:00:00.000Z');
      expect(serialized.nested.anotherDate).toBe('2023-01-02T00:00:00.000Z');
    });
  });

  describe('deserializeFromJSON', () => {
    it('should deserialize ISO strings to dates', () => {
      const obj = {
        name: 'test',
        date: '2023-01-01T00:00:00.000Z',
        nested: {
          anotherDate: '2023-01-02T00:00:00.000Z'
        }
      };

      const deserialized = deserializeFromJSON(obj);
      
      expect(deserialized.date).toBeInstanceOf(Date);
      expect(deserialized.nested.anotherDate).toBeInstanceOf(Date);
    });
  });
});

describe('Error utilities', () => {
  describe('createValidationError', () => {
    it('should create validation error', () => {
      const error = createValidationError('name', 'is required');
      
      expect(error.message).toBe('Validation error for name: is required');
      expect(error.name).toBe('ValidationError');
    });
  });

  describe('createNotFoundError', () => {
    it('should create not found error', () => {
      const error = createNotFoundError('User', '123');
      
      expect(error.message).toBe('User with id 123 not found');
      expect(error.name).toBe('NotFoundError');
    });
  });
});

describe('Data sanitization utilities', () => {
  describe('sanitizeString', () => {
    it('should trim and normalize whitespace', () => {
      expect(sanitizeString('  hello   world  ')).toBe('hello world');
      expect(sanitizeString('test\n\nstring')).toBe('test string');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      const longString = 'This is a very long string that should be truncated';
      expect(truncateString(longString, 20)).toBe('This is a very lo...');
      expect(truncateString('short', 20)).toBe('short');
    });
  });

  describe('sanitizeUserInput', () => {
    it('should remove script tags and angle brackets', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello <b>world</b>';
      const sanitized = sanitizeUserInput(maliciousInput);
      
      expect(sanitized).toBe('Hello bworld/b');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
    });
  });
});
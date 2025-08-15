// Unit tests for data model validation functions

import {
  validateCreateUserRequest,
  validateUpdateUserRequest,
  validateUserPreferences,
  validateCreateSessionRequest,
  validateUpdateSessionRequest,
  validateCreateGoalRequest,
  validateUpdateGoalRequest,
  validateCreateMessageRequest,
  isValidUUID,
  isValidEmail,
  isValidDate,
  isValidSessionStatus,
  isValidEmotion,
  isValidGoalStatus,
  isValidMessageSpeaker
} from '../validation';

describe('Helper validation functions', () => {
  describe('isValidUUID', () => {
    it('should validate correct UUIDs', () => {
      expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should reject invalid UUIDs', () => {
      expect(isValidUUID('invalid-uuid')).toBe(false);
      expect(isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(isValidUUID('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    it('should validate correct dates', () => {
      expect(isValidDate(new Date())).toBe(true);
      expect(isValidDate(new Date('2023-01-01'))).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(isValidDate(new Date('invalid'))).toBe(false);
      expect(isValidDate('2023-01-01')).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('isValidSessionStatus', () => {
    it('should validate correct session statuses', () => {
      expect(isValidSessionStatus('active')).toBe(true);
      expect(isValidSessionStatus('completed')).toBe(true);
      expect(isValidSessionStatus('cancelled')).toBe(true);
    });

    it('should reject invalid session statuses', () => {
      expect(isValidSessionStatus('invalid')).toBe(false);
      expect(isValidSessionStatus('')).toBe(false);
      expect(isValidSessionStatus(null)).toBe(false);
    });
  });

  describe('isValidEmotion', () => {
    it('should validate correct emotions', () => {
      expect(isValidEmotion('happy')).toBe(true);
      expect(isValidEmotion('sad')).toBe(true);
      expect(isValidEmotion('anxious')).toBe(true);
      expect(isValidEmotion('neutral')).toBe(true);
    });

    it('should reject invalid emotions', () => {
      expect(isValidEmotion('invalid')).toBe(false);
      expect(isValidEmotion('')).toBe(false);
      expect(isValidEmotion(null)).toBe(false);
    });
  });

  describe('isValidGoalStatus', () => {
    it('should validate correct goal statuses', () => {
      expect(isValidGoalStatus('active')).toBe(true);
      expect(isValidGoalStatus('completed')).toBe(true);
      expect(isValidGoalStatus('cancelled')).toBe(true);
    });

    it('should reject invalid goal statuses', () => {
      expect(isValidGoalStatus('invalid')).toBe(false);
      expect(isValidGoalStatus('')).toBe(false);
      expect(isValidGoalStatus(null)).toBe(false);
    });
  });

  describe('isValidMessageSpeaker', () => {
    it('should validate correct message speakers', () => {
      expect(isValidMessageSpeaker('user')).toBe(true);
      expect(isValidMessageSpeaker('numa')).toBe(true);
    });

    it('should reject invalid message speakers', () => {
      expect(isValidMessageSpeaker('invalid')).toBe(false);
      expect(isValidMessageSpeaker('')).toBe(false);
      expect(isValidMessageSpeaker(null)).toBe(false);
    });
  });
});

describe('User validation', () => {
  describe('validateCreateUserRequest', () => {
    it('should validate valid user creation request', () => {
      const validRequest = {
        name: 'John Doe',
        preferences: {
          voice_settings: {
            preferred_voice: 'default',
            speech_rate: 1.0,
            volume: 0.8
          }
        }
      };

      const result = validateCreateUserRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate request with minimal data', () => {
      const minimalRequest = {};
      const result = validateCreateUserRequest(minimalRequest);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid name', () => {
      const invalidRequest = { name: '' };
      const result = validateCreateUserRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot be empty');
    });

    it('should reject name that is too long', () => {
      const longName = 'a'.repeat(256);
      const invalidRequest = { name: longName };
      const result = validateCreateUserRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name cannot exceed 255 characters');
    });

    it('should reject non-string name', () => {
      const invalidRequest = { name: 123 };
      const result = validateCreateUserRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name must be a string');
    });
  });

  describe('validateUserPreferences', () => {
    it('should validate valid preferences', () => {
      const validPreferences = {
        voice_settings: {
          preferred_voice: 'default',
          speech_rate: 1.0,
          volume: 0.8
        },
        therapy_settings: {
          session_reminder: true,
          goal_tracking: true,
          emotion_tracking: false
        },
        privacy_settings: {
          data_retention_days: 90,
          analytics_enabled: true
        }
      };

      const result = validateUserPreferences(validPreferences);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object preferences', () => {
      const result = validateUserPreferences('invalid');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Preferences must be an object');
    });

    it('should reject invalid speech_rate', () => {
      const invalidPreferences = {
        voice_settings: { speech_rate: 5.0 }
      };
      const result = validateUserPreferences(invalidPreferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('speech_rate must be a number between 0.1 and 3.0');
    });

    it('should reject invalid volume', () => {
      const invalidPreferences = {
        voice_settings: { volume: 2.0 }
      };
      const result = validateUserPreferences(invalidPreferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('volume must be a number between 0 and 1');
    });

    it('should reject invalid data_retention_days', () => {
      const invalidPreferences = {
        privacy_settings: { data_retention_days: -1 }
      };
      const result = validateUserPreferences(invalidPreferences);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('data_retention_days must be a positive number');
    });
  });
});

describe('Session validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('validateCreateSessionRequest', () => {
    it('should validate valid session creation request', () => {
      const validRequest = {
        user_id: validUUID,
        transcript: 'Hello, how are you feeling today?',
        summary: 'Initial greeting and mood check',
        emotion: 'neutral',
        duration_minutes: 30
      };

      const result = validateCreateSessionRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minimal session request', () => {
      const minimalRequest = { user_id: validUUID };
      const result = validateCreateSessionRequest(minimalRequest);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing user_id', () => {
      const invalidRequest = {};
      const result = validateCreateSessionRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('user_id is required');
    });

    it('should reject invalid user_id', () => {
      const invalidRequest = { user_id: 'invalid-uuid' };
      const result = validateCreateSessionRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('user_id must be a valid UUID');
    });

    it('should reject invalid emotion', () => {
      const invalidRequest = {
        user_id: validUUID,
        emotion: 'invalid-emotion'
      };
      const result = validateCreateSessionRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('emotion must be a valid emotion type');
    });

    it('should reject negative duration', () => {
      const invalidRequest = {
        user_id: validUUID,
        duration_minutes: -5
      };
      const result = validateCreateSessionRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('duration_minutes must be a non-negative number');
    });
  });

  describe('validateUpdateSessionRequest', () => {
    it('should validate valid session update request', () => {
      const validRequest = {
        transcript: 'Updated transcript',
        summary: 'Updated summary',
        emotion: 'happy',
        duration_minutes: 45,
        status: 'completed'
      };

      const result = validateUpdateSessionRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty update request', () => {
      const emptyRequest = {};
      const result = validateUpdateSessionRequest(emptyRequest);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidRequest = { status: 'invalid-status' };
      const result = validateUpdateSessionRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('status must be a valid session status');
    });
  });
});

describe('Goal validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('validateCreateGoalRequest', () => {
    it('should validate valid goal creation request', () => {
      const validRequest = {
        user_id: validUUID,
        description: 'Practice mindfulness for 10 minutes daily',
        target_date: new Date('2024-12-31'),
        progress_notes: ['Started today', 'Feeling positive']
      };

      const result = validateCreateGoalRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minimal goal request', () => {
      const minimalRequest = {
        user_id: validUUID,
        description: 'Simple goal'
      };
      const result = validateCreateGoalRequest(minimalRequest);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing user_id', () => {
      const invalidRequest = { description: 'Goal without user' };
      const result = validateCreateGoalRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('user_id is required');
    });

    it('should reject missing description', () => {
      const invalidRequest = { user_id: validUUID };
      const result = validateCreateGoalRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('description is required');
    });

    it('should reject empty description', () => {
      const invalidRequest = {
        user_id: validUUID,
        description: '   '
      };
      const result = validateCreateGoalRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('description cannot be empty');
    });

    it('should reject invalid progress_notes', () => {
      const invalidRequest = {
        user_id: validUUID,
        description: 'Valid goal',
        progress_notes: ['valid note', 123, 'another valid note']
      };
      const result = validateCreateGoalRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('all progress_notes must be strings');
    });
  });

  describe('validateUpdateGoalRequest', () => {
    it('should validate valid goal update request', () => {
      const validRequest = {
        description: 'Updated goal description',
        status: 'completed',
        target_date: new Date('2024-12-31'),
        progress_notes: ['Progress update']
      };

      const result = validateUpdateGoalRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty update request', () => {
      const emptyRequest = {};
      const result = validateUpdateGoalRequest(emptyRequest);
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid status', () => {
      const invalidRequest = { status: 'invalid-status' };
      const result = validateUpdateGoalRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('status must be a valid goal status');
    });
  });
});

describe('Message validation', () => {
  const validUUID = '123e4567-e89b-12d3-a456-426614174000';

  describe('validateCreateMessageRequest', () => {
    it('should validate valid message creation request', () => {
      const validRequest = {
        speaker: 'user',
        content: 'Hello, I need help with anxiety',
        emotion: 'anxious',
        confidence: 0.85,
        session_id: validUUID
      };

      const result = validateCreateMessageRequest(validRequest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate minimal message request', () => {
      const minimalRequest = {
        speaker: 'numa',
        content: 'How can I help you today?'
      };
      const result = validateCreateMessageRequest(minimalRequest);
      expect(result.isValid).toBe(true);
    });

    it('should reject missing speaker', () => {
      const invalidRequest = { content: 'Message without speaker' };
      const result = validateCreateMessageRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('speaker is required');
    });

    it('should reject invalid speaker', () => {
      const invalidRequest = {
        speaker: 'invalid-speaker',
        content: 'Valid content'
      };
      const result = validateCreateMessageRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('speaker must be either "user" or "numa"');
    });

    it('should reject missing content', () => {
      const invalidRequest = { speaker: 'user' };
      const result = validateCreateMessageRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('content is required');
    });

    it('should reject empty content', () => {
      const invalidRequest = {
        speaker: 'user',
        content: '   '
      };
      const result = validateCreateMessageRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('content cannot be empty');
    });

    it('should reject invalid confidence', () => {
      const invalidRequest = {
        speaker: 'user',
        content: 'Valid content',
        confidence: 1.5
      };
      const result = validateCreateMessageRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('confidence must be a number between 0 and 1');
    });

    it('should reject invalid session_id', () => {
      const invalidRequest = {
        speaker: 'user',
        content: 'Valid content',
        session_id: 'invalid-uuid'
      };
      const result = validateCreateMessageRequest(invalidRequest);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('session_id must be a valid UUID');
    });
  });
});
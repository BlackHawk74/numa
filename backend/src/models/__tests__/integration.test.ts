// Integration tests for data models working together

import { User, CreateUserRequest } from '../User';
import { Session, CreateSessionRequest } from '../Session';
import { Goal, CreateGoalRequest } from '../Goal';
import { Message, CreateMessageRequest } from '../Message';

import {
  validateCreateUserRequest,
  validateCreateSessionRequest,
  validateCreateGoalRequest,
  validateCreateMessageRequest
} from '../validation';

import {
  transformUserRowToUser,
  transformSessionRowToSession,
  transformGoalRowToGoal,
  createMessage,
  createConversationContext,
  formatConversationForAI,
  createDefaultUserPreferences
} from '../utils';

describe('Data Models Integration', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockSessionId = '456e7890-e89b-12d3-a456-426614174000';

  describe('Complete user workflow', () => {
    it('should create and validate a complete user with session and goals', () => {
      // 1. Create user request
      const userRequest: CreateUserRequest = {
        name: 'John Doe',
        preferences: createDefaultUserPreferences()
      };

      // 2. Validate user request
      const userValidation = validateCreateUserRequest(userRequest);
      expect(userValidation.isValid).toBe(true);

      // 3. Create session request
      const sessionRequest: CreateSessionRequest = {
        user_id: mockUserId,
        transcript: 'Hello, I need help with anxiety',
        emotion: 'anxious',
        duration_minutes: 30
      };

      // 4. Validate session request
      const sessionValidation = validateCreateSessionRequest(sessionRequest);
      expect(sessionValidation.isValid).toBe(true);

      // 5. Create goal request
      const goalRequest: CreateGoalRequest = {
        user_id: mockUserId,
        description: 'Practice deep breathing exercises daily',
        target_date: new Date('2024-12-31'),
        progress_notes: ['Starting today with 5 minutes']
      };

      // 6. Validate goal request
      const goalValidation = validateCreateGoalRequest(goalRequest);
      expect(goalValidation.isValid).toBe(true);

      // All validations should pass
      expect(userValidation.isValid).toBe(true);
      expect(sessionValidation.isValid).toBe(true);
      expect(goalValidation.isValid).toBe(true);
    });
  });

  describe('Conversation flow integration', () => {
    it('should handle a complete conversation flow', () => {
      // 1. Create user message
      const userMessageRequest: CreateMessageRequest = {
        speaker: 'user',
        content: 'I feel really anxious about my job interview tomorrow',
        emotion: 'anxious',
        confidence: 0.9,
        session_id: mockSessionId
      };

      const userMessage = createMessage(userMessageRequest);
      expect(userMessage.speaker).toBe('user');
      expect(userMessage.emotion).toBe('anxious');

      // 2. Create Numa response
      const numaMessageRequest: CreateMessageRequest = {
        speaker: 'numa',
        content: 'I understand that job interviews can feel overwhelming. Can you tell me what specifically worries you most?',
        session_id: mockSessionId
      };

      const numaMessage = createMessage(numaMessageRequest);
      expect(numaMessage.speaker).toBe('numa');

      // 3. Create conversation context
      const messages = [userMessage, numaMessage];
      const context = createConversationContext(messages, mockUserId, mockSessionId);

      expect(context.messages).toHaveLength(2);
      expect(context.user_id).toBe(mockUserId);
      expect(context.session_id).toBe(mockSessionId);
      expect(context.current_emotion).toBe('anxious');

      // 4. Format for AI processing
      const formattedConversation = formatConversationForAI(context);
      expect(formattedConversation).toContain('USER: I feel really anxious');
      expect(formattedConversation).toContain('NUMA: I understand that job interviews');
    });
  });

  describe('Data transformation integration', () => {
    it('should transform database rows to domain objects correctly', () => {
      // Mock database rows
      const userRow = {
        id: mockUserId,
        name: 'Jane Smith',
        created_at: '2023-01-01T00:00:00.000Z',
        preferences: {
          voice_settings: { preferred_voice: 'female' },
          therapy_settings: { session_reminder: true }
        },
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      const sessionRow = {
        id: mockSessionId,
        user_id: mockUserId,
        date: '2023-01-01T10:00:00.000Z',
        transcript: 'Therapy session transcript',
        summary: 'Discussed anxiety management',
        emotion: 'anxious',
        duration_minutes: 45,
        status: 'completed',
        created_at: '2023-01-01T10:00:00.000Z',
        updated_at: '2023-01-01T10:45:00.000Z'
      };

      const goalRow = {
        id: '789e0123-e89b-12d3-a456-426614174000',
        user_id: mockUserId,
        description: 'Practice mindfulness meditation',
        created_at: '2023-01-01T00:00:00.000Z',
        status: 'active',
        target_date: '2023-12-31',
        progress_notes: ['Week 1: 5 minutes daily', 'Week 2: 10 minutes daily'],
        updated_at: '2023-01-01T00:00:00.000Z'
      };

      // Transform to domain objects
      const user = transformUserRowToUser(userRow);
      const session = transformSessionRowToSession(sessionRow);
      const goal = transformGoalRowToGoal(goalRow);

      // Verify transformations
      expect(user.id).toBe(mockUserId);
      expect(user.name).toBe('Jane Smith');
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.preferences.voice_settings?.preferred_voice).toBe('female');

      expect(session.id).toBe(mockSessionId);
      expect(session.user_id).toBe(mockUserId);
      expect(session.date).toBeInstanceOf(Date);
      expect(session.emotion).toBe('anxious');
      expect(session.status).toBe('completed');

      expect(goal.user_id).toBe(mockUserId);
      expect(goal.description).toBe('Practice mindfulness meditation');
      expect(goal.target_date).toBeInstanceOf(Date);
      expect(goal.progress_notes).toHaveLength(2);
      expect(goal.status).toBe('active');
    });
  });

  describe('Validation error handling', () => {
    it('should collect multiple validation errors', () => {
      const invalidUserRequest = {
        name: '', // Empty name
        preferences: {
          voice_settings: {
            speech_rate: 5.0, // Invalid rate
            volume: 2.0 // Invalid volume
          }
        }
      };

      const validation = validateCreateUserRequest(invalidUserRequest);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Name cannot be empty');
      expect(validation.errors).toContain('speech_rate must be a number between 0.1 and 3.0');
      expect(validation.errors).toContain('volume must be a number between 0 and 1');
      expect(validation.errors).toHaveLength(3);
    });

    it('should validate complex session data', () => {
      const invalidSessionRequest = {
        user_id: 'invalid-uuid',
        emotion: 'invalid-emotion',
        duration_minutes: -10
      };

      const validation = validateCreateSessionRequest(invalidSessionRequest);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('user_id must be a valid UUID');
      expect(validation.errors).toContain('emotion must be a valid emotion type');
      expect(validation.errors).toContain('duration_minutes must be a non-negative number');
    });
  });

  describe('Real-world scenario simulation', () => {
    it('should handle a complete therapy session workflow', () => {
      // 1. User starts session
      const sessionStart: CreateSessionRequest = {
        user_id: mockUserId
      };

      expect(validateCreateSessionRequest(sessionStart).isValid).toBe(true);

      // 2. User sends first message
      const firstMessage = createMessage({
        speaker: 'user',
        content: 'I have been feeling overwhelmed lately',
        emotion: 'overwhelmed',
        confidence: 0.8
      });

      // 3. Numa responds
      const numaResponse = createMessage({
        speaker: 'numa',
        content: 'I hear that you are feeling overwhelmed. That must be difficult. Can you tell me more about what is contributing to these feelings?'
      });

      // 4. User continues conversation
      const secondMessage = createMessage({
        speaker: 'user',
        content: 'Work has been really stressful and I cannot seem to manage my time',
        emotion: 'anxious',
        confidence: 0.9
      });

      // 5. Create conversation context
      const messages = [firstMessage, numaResponse, secondMessage];
      const context = createConversationContext(messages, mockUserId);

      // 6. Verify conversation flow
      expect(context.messages).toHaveLength(3);
      expect(context.current_emotion).toBe('anxious'); // Latest user emotion
      
      const formatted = formatConversationForAI(context);
      expect(formatted).toContain('USER: I have been feeling overwhelmed');
      expect(formatted).toContain('NUMA: I hear that you are feeling overwhelmed');
      expect(formatted).toContain('USER: Work has been really stressful');

      // 7. Session ends with goal creation
      const sessionGoal: CreateGoalRequest = {
        user_id: mockUserId,
        description: 'Create a daily schedule to better manage work tasks',
        progress_notes: ['Discussed time management strategies']
      };

      expect(validateCreateGoalRequest(sessionGoal).isValid).toBe(true);
    });
  });
});
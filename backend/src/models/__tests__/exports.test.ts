// Test to verify all models are properly exported

import * as Models from '../index';

describe('Model exports', () => {
  it('should export all interfaces and types', () => {
    // Check that all main interfaces are exported
    expect(typeof Models).toBe('object');
    
    // Validation functions should be exported
    expect(typeof Models.validateCreateUserRequest).toBe('function');
    expect(typeof Models.validateCreateSessionRequest).toBe('function');
    expect(typeof Models.validateCreateGoalRequest).toBe('function');
    expect(typeof Models.validateCreateMessageRequest).toBe('function');
    
    // Utility functions should be exported
    expect(typeof Models.transformUserRowToUser).toBe('function');
    expect(typeof Models.transformSessionRowToSession).toBe('function');
    expect(typeof Models.transformGoalRowToGoal).toBe('function');
    expect(typeof Models.createMessage).toBe('function');
    expect(typeof Models.createConversationContext).toBe('function');
    
    // Helper functions should be exported
    expect(typeof Models.isValidUUID).toBe('function');
    expect(typeof Models.isValidEmotion).toBe('function');
    expect(typeof Models.sanitizeUserInput).toBe('function');
  });
});
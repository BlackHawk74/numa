# Data Models and Interfaces

This directory contains the core data models, interfaces, validation functions, and utility functions for the Numa AI Therapist application.

## Overview

The models are designed to support the requirements for:
- User management with preferences and session history
- Therapy session tracking with emotion detection
- Goal setting and progress monitoring
- Real-time conversation handling

## Core Models

### User Model (`User.ts`)
- **User**: Main user interface with preferences and metadata
- **UserPreferences**: Structured preferences for voice, therapy, and privacy settings
- **CreateUserRequest/UpdateUserRequest**: Request interfaces for user operations
- **UserRow**: Database row representation

### Session Model (`Session.ts`)
- **Session**: Therapy session with transcript, summary, and emotion data
- **SessionStatus**: `'active' | 'completed' | 'cancelled'`
- **EmotionType**: Comprehensive emotion types for sentiment analysis
- **SessionSummary**: Lightweight session overview
- **CreateSessionRequest/UpdateSessionRequest**: Request interfaces

### Goal Model (`Goal.ts`)
- **Goal**: User goals with progress tracking and target dates
- **GoalStatus**: `'active' | 'completed' | 'cancelled'`
- **CreateGoalRequest/UpdateGoalRequest**: Request interfaces
- **GoalProgress**: Progress tracking interface

### Message Model (`Message.ts`)
- **Message**: Individual conversation messages with metadata
- **MessageSpeaker**: `'user' | 'numa'`
- **ConversationContext**: Context for AI processing
- **TherapyResponse**: Structured AI response format

## Validation Functions (`validation.ts`)

Comprehensive validation for all models including:
- **UUID validation**: `isValidUUID()`
- **Email validation**: `isValidEmail()`
- **Date validation**: `isValidDate()`
- **Enum validation**: `isValidSessionStatus()`, `isValidEmotion()`, etc.
- **Request validation**: `validateCreateUserRequest()`, `validateCreateSessionRequest()`, etc.

All validation functions return a `ValidationResult` with:
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

## Utility Functions (`utils.ts`)

### Data Transformation
- **User transformations**: `transformUserRowToUser()`, `transformUserToUserRow()`
- **Session transformations**: `transformSessionRowToSession()`, `transformSessionToSessionRow()`
- **Goal transformations**: `transformGoalRowToGoal()`, `transformGoalToGoalRow()`

### Message Utilities
- **Message creation**: `createMessage()`, `generateMessageId()`
- **Conversation handling**: `createConversationContext()`, `formatConversationForAI()`

### Date Utilities
- **Formatting**: `formatDateForDisplay()`
- **Comparison**: `isDateInPast()`, `daysBetween()`

### Serialization
- **JSON handling**: `serializeForJSON()`, `deserializeFromJSON()`
- **Data sanitization**: `sanitizeString()`, `sanitizeUserInput()`

### Error Handling
- **Error creation**: `createValidationError()`, `createNotFoundError()`

## Testing

Comprehensive test suite with 83 tests covering:

### Validation Tests (`__tests__/validation.test.ts`)
- All validation functions with valid and invalid inputs
- Edge cases and error message verification
- Complex validation scenarios

### Utility Tests (`__tests__/utils.test.ts`)
- Data transformation functions
- Message and conversation utilities
- Date and serialization functions
- Error handling and sanitization

### Integration Tests (`__tests__/integration.test.ts`)
- Complete user workflows
- Conversation flow scenarios
- Data transformation chains
- Real-world usage patterns

### Export Tests (`__tests__/exports.test.ts`)
- Verification that all functions are properly exported

## Usage Examples

### Creating a User
```typescript
import { validateCreateUserRequest, createDefaultUserPreferences } from './models';

const userRequest = {
  name: 'John Doe',
  preferences: createDefaultUserPreferences()
};

const validation = validateCreateUserRequest(userRequest);
if (validation.isValid) {
  // Proceed with user creation
}
```

### Handling Conversations
```typescript
import { createMessage, createConversationContext, formatConversationForAI } from './models';

const userMessage = createMessage({
  speaker: 'user',
  content: 'I feel anxious about work',
  emotion: 'anxious'
});

const context = createConversationContext([userMessage], userId);
const aiInput = formatConversationForAI(context);
```

### Session Management
```typescript
import { validateCreateSessionRequest, transformSessionRowToSession } from './models';

const sessionRequest = {
  user_id: userId,
  transcript: 'Session transcript...',
  emotion: 'anxious',
  duration_minutes: 30
};

const validation = validateCreateSessionRequest(sessionRequest);
if (validation.isValid) {
  // Create session in database
}
```

## Requirements Satisfied

This implementation satisfies the following requirements:

- **Requirement 2.1**: User session memory and context retrieval
- **Requirement 2.2**: Session storage with summaries and emotions
- **Requirement 2.3**: Goal creation and tracking

The models provide a solid foundation for the therapy application with comprehensive validation, transformation utilities, and extensive test coverage.
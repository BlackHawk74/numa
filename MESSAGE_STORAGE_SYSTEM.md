# Message Storage System

## Overview

The Numa AI Therapist now stores individual conversation messages in the database instead of just session transcripts. This provides better conversation management, context retrieval, and analytics capabilities.

## Database Schema

### Messages Table

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    speaker VARCHAR(20) NOT NULL CHECK (speaker IN ('user', 'numa', 'system')),
    content TEXT NOT NULL,
    emotion VARCHAR(50),
    emotion_confidence DECIMAL(3,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Sessions Table Updates

- Added `conversation_count` column to track number of messages
- Automatic trigger updates count when messages are added/removed

## Implementation

### Backend Components

1. **MessageRepository** (`backend/src/database/repositories/MessageRepository.ts`)
   - CRUD operations for messages
   - Conversation history retrieval
   - Message statistics
   - Conversation pair creation (user + AI response)

2. **Messages API Routes** (`backend/src/routes/messages.ts`)
   - `GET /api/messages/session/:sessionId` - Get messages for a session
   - `GET /api/messages/user/:userId` - Get all user messages
   - `GET /api/messages/conversation/:userId/:sessionId?` - Get conversation history
   - `GET /api/messages/stats/:userId` - Get message statistics
   - `POST /api/messages` - Create individual messages

3. **Updated Therapy Route** (`backend/src/routes/therapy.ts`)
   - Now stores individual messages instead of transcript strings
   - Uses `MessageRepository.createConversationPair()` for user/AI exchanges
   - Retrieves conversation history from messages table for AI context

### Key Features

#### Individual Message Storage
```typescript
// Each conversation turn is stored as separate messages
await MessageRepository.createConversationPair(
  sessionId,
  userId,
  userMessage,
  aiResponse,
  emotion,
  emotionConfidence,
  metadata
);
```

#### Conversation Context for AI
```typescript
// AI receives structured conversation history
const conversationHistory = await MessageRepository.getConversationHistory(
  userId,
  sessionId,
  maxMessages
);

// Format: [{ speaker: 'user', content: '...', timestamp: '...' }, ...]
```

#### Message Statistics
```typescript
const stats = await MessageRepository.getMessageStats(userId);
// Returns: totalMessages, userMessages, aiMessages, averageMessageLength, mostCommonEmotion
```

## Migration

### Apply the Migration

1. **Run the migration script:**
   ```bash
   cd backend
   node apply-messages-migration.js
   ```

2. **Test the system:**
   ```bash
   node test-message-storage.js
   ```

### Migration Details

The migration (`002_add_messages_table.sql`) includes:
- Creates `messages` table with proper relationships
- Adds `conversation_count` to sessions table
- Creates automatic trigger to update conversation count
- Sets up Row Level Security (RLS) policies
- Creates performance indexes

## Benefits

### 1. Better Conversation Management
- Individual messages can be edited, deleted, or flagged
- Precise conversation flow tracking
- Better error handling for partial conversations

### 2. Enhanced AI Context
- Structured conversation history instead of text parsing
- Emotion tracking per message
- Metadata storage for additional context

### 3. Improved Analytics
- Message-level statistics and insights
- Conversation pattern analysis
- User engagement metrics

### 4. Scalability
- Efficient querying with proper indexes
- Pagination support for large conversations
- Optimized database performance

## API Usage Examples

### Get Session Messages
```typescript
const response = await fetch(`/api/messages/session/${sessionId}`);
const { messages } = await response.json();
```

### Get Conversation History for AI
```typescript
const response = await fetch(`/api/messages/conversation/${userId}/${sessionId}?maxMessages=10`);
const { conversationHistory } = await response.json();
```

### Get User Message Statistics
```typescript
const response = await fetch(`/api/messages/stats/${userId}`);
const { stats } = await response.json();
// stats: { totalMessages, userMessages, aiMessages, averageMessageLength, mostCommonEmotion }
```

## Frontend Integration

The frontend can now:
1. Load individual messages for display
2. Show conversation history with proper formatting
3. Display message-level emotions and metadata
4. Implement message-based features (reactions, editing, etc.)

## Security

- Row Level Security (RLS) ensures users only access their own messages
- All message content is sanitized before storage
- UUID-based IDs prevent enumeration attacks
- Proper foreign key constraints maintain data integrity

## Performance

- Indexed on session_id, user_id, timestamp, and speaker
- Automatic conversation count tracking
- Efficient pagination support
- Optimized queries for conversation history retrieval

## Testing

Run the test suite to verify everything is working:

```bash
cd backend
node test-message-storage.js
```

This will test:
- Message creation and retrieval
- Conversation history functionality
- Statistics calculation
- Conversation count triggers
- Row Level Security

## Backward Compatibility

The system maintains backward compatibility:
- Existing sessions with transcript data continue to work
- New sessions use the message-based system
- The AI conversation service works with both formats
- Migration is non-destructive (adds new tables/columns)
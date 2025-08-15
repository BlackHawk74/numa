# Numa AI Therapist - API Documentation

This document describes the REST API endpoints for the Numa AI Therapist backend.

## Base URL

- **Development**: `http://localhost:3001`
- **Production**: `https://your-domain.com/api`

## Authentication

The API uses Supabase authentication with JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Health Endpoints

### GET /health

Check overall system health.

**Response:**
```json
{
  "status": "OK",
  "message": "Numa AI Therapist Backend is running",
  "database": {
    "status": "healthy",
    "message": "Database connection is healthy",
    "timestamp": "2025-01-12T14:30:00.000Z"
  }
}
```

### GET /health/database

Check database-specific health.

**Response:**
```json
{
  "status": "healthy",
  "message": "Database connection is healthy",
  "timestamp": "2025-01-12T14:30:00.000Z"
}
```

## User Endpoints

### POST /api/users

Create a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": true
  }
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "notifications": true
  },
  "created_at": "2025-01-12T14:30:00.000Z",
  "updated_at": "2025-01-12T14:30:00.000Z"
}
```

### GET /api/users/:id

Get user by ID.

**Response:**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "preferences": {
    "theme": "dark",
    "language": "en"
  },
  "created_at": "2025-01-12T14:30:00.000Z",
  "updated_at": "2025-01-12T14:30:00.000Z"
}
```

### PUT /api/users/:id

Update user information.

**Request Body:**
```json
{
  "name": "John Smith",
  "preferences": {
    "theme": "light"
  }
}
```

### GET /api/users/:id/context

Get user with recent sessions and active goals.

**Response:**
```json
{
  "user": {
    "id": "uuid-string",
    "name": "John Doe",
    "preferences": {...}
  },
  "recentSessions": [
    {
      "id": "session-uuid",
      "date": "2025-01-12T14:00:00.000Z",
      "emotion": "calm",
      "duration_minutes": 25
    }
  ],
  "activeGoals": [
    {
      "id": "goal-uuid",
      "description": "Practice mindfulness daily",
      "status": "active",
      "target_date": "2025-02-01"
    }
  ]
}
```

## Session Endpoints

### POST /api/sessions

Create a new therapy session.

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "transcript": "User discussed anxiety about work...",
  "emotion": "anxious",
  "duration_minutes": 30
}
```

**Response:**
```json
{
  "id": "session-uuid",
  "user_id": "user-uuid",
  "date": "2025-01-12T14:30:00.000Z",
  "transcript": "User discussed anxiety about work...",
  "summary": null,
  "emotion": "anxious",
  "duration_minutes": 30,
  "status": "active",
  "created_at": "2025-01-12T14:30:00.000Z",
  "updated_at": "2025-01-12T14:30:00.000Z"
}
```

### GET /api/sessions/:id

Get session by ID.

### PUT /api/sessions/:id

Update session information.

### POST /api/sessions/:id/complete

Complete a session with summary.

**Request Body:**
```json
{
  "summary": "User learned breathing techniques and reported feeling calmer",
  "emotion": "hopeful",
  "duration_minutes": 35
}
```

### GET /api/users/:userId/sessions

Get sessions for a user.

**Query Parameters:**
- `limit` (optional): Number of sessions to return (default: 10)
- `offset` (optional): Number of sessions to skip (default: 0)

### GET /api/users/:userId/sessions/stats

Get session statistics for a user.

**Response:**
```json
{
  "totalSessions": 15,
  "completedSessions": 12,
  "averageDuration": 28.5,
  "mostCommonEmotion": "calm"
}
```

## Goal Endpoints

### POST /api/goals

Create a new goal.

**Request Body:**
```json
{
  "user_id": "user-uuid",
  "description": "Practice deep breathing for 10 minutes daily",
  "target_date": "2025-02-15"
}
```

**Response:**
```json
{
  "id": "goal-uuid",
  "user_id": "user-uuid",
  "description": "Practice deep breathing for 10 minutes daily",
  "status": "active",
  "target_date": "2025-02-15",
  "progress_notes": [],
  "created_at": "2025-01-12T14:30:00.000Z",
  "updated_at": "2025-01-12T14:30:00.000Z"
}
```

### GET /api/goals/:id

Get goal by ID.

### PUT /api/goals/:id

Update goal information.

### POST /api/goals/:id/progress

Add a progress note to a goal.

**Request Body:**
```json
{
  "note": "Completed 10 minutes of breathing exercises today. Felt more relaxed."
}
```

### POST /api/goals/:id/complete

Mark a goal as completed.

**Request Body:**
```json
{
  "note": "Successfully established daily breathing routine. Ready for next challenge."
}
```

### GET /api/users/:userId/goals

Get goals for a user.

**Query Parameters:**
- `status` (optional): Filter by status ('active', 'completed', 'cancelled')
- `limit` (optional): Number of goals to return (default: 10)
- `offset` (optional): Number of goals to skip (default: 0)

### GET /api/users/:userId/goals/stats

Get goal statistics for a user.

**Response:**
```json
{
  "totalGoals": 8,
  "activeGoals": 3,
  "completedGoals": 5,
  "completionRate": 62.5,
  "overdueTasks": 1
}
```

### GET /api/users/:userId/goals/due-soon

Get goals due within the next 7 days.

**Query Parameters:**
- `days` (optional): Number of days to look ahead (default: 7)

## AI Conversation Endpoints

### POST /api/chat

Send a message to the AI therapist.

**Request Body:**
```json
{
  "message": "I'm feeling anxious about my job interview tomorrow",
  "user_id": "user-uuid",
  "session_id": "session-uuid"
}
```

**Response:**
```json
{
  "response": "I understand that job interviews can feel overwhelming. Let's work through some techniques that can help you feel more prepared and confident...",
  "emotion_detected": "anxious",
  "confidence": 0.85,
  "suggestions": [
    "Practice deep breathing exercises",
    "Prepare answers to common questions",
    "Visualize a successful interview"
  ]
}
```

## Error Responses

All endpoints return consistent error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid input data",
  "details": "User ID is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Rate Limiting

API endpoints are rate-limited to prevent abuse:
- **General endpoints**: 100 requests per minute per IP
- **AI chat endpoint**: 20 requests per minute per user
- **Authentication endpoints**: 10 requests per minute per IP

## Data Types

### User Object
```typescript
interface User {
  id: string;
  name?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### Session Object
```typescript
interface Session {
  id: string;
  user_id: string;
  date?: string;
  transcript?: string;
  summary?: string;
  emotion?: string;
  duration_minutes?: number;
  status?: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}
```

### Goal Object
```typescript
interface Goal {
  id: string;
  user_id: string;
  description: string;
  status?: 'active' | 'completed' | 'cancelled';
  target_date?: string;
  progress_notes?: string[];
  created_at: string;
  updated_at: string;
}
```

## SDK Usage Examples

### JavaScript/TypeScript
```typescript
// Initialize client
const client = new NumaAPIClient('http://localhost:3001', token);

// Create a user
const user = await client.users.create({
  name: 'John Doe',
  preferences: { theme: 'dark' }
});

// Start a session
const session = await client.sessions.create({
  user_id: user.id,
  emotion: 'neutral'
});

// Chat with AI
const response = await client.chat.send({
  message: 'Hello, I need help with anxiety',
  user_id: user.id,
  session_id: session.id
});
```

This API documentation provides a comprehensive overview of all available endpoints. For implementation details, refer to the backend source code in `/backend/src/`.
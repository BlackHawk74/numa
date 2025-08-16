# Numa AI Therapist - Backend API Endpoints

## Overview

This document describes all the API endpoints implemented for the Numa AI Therapist backend. The API provides speech-to-text, CBT conversation, text-to-speech, and session management capabilities.

## Base URL

- Development: `http://localhost:3001`
- Production: TBD

## Authentication

Currently, no authentication is required. User identification is handled via UUID parameters.

## Rate Limiting

- 100 requests per 15 minutes per IP address
- Rate limit headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Remaining requests in current window
  - `X-RateLimit-Reset`: When the rate limit resets

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "type": "error_category"
}
```

## Health Endpoints

### GET /health

Check overall application health.

**Response:**
```json
{
  "status": "OK",
  "message": "Numa AI Therapist Backend is running",
  "database": {
    "status": "healthy",
    "message": "Database connection is healthy",
    "timestamp": "2025-08-16T06:27:22.469Z"
  }
}
```

### GET /health/database

Check database connection health.

**Response:**
```json
{
  "status": "healthy",
  "message": "Database connection is healthy",
  "timestamp": "2025-08-16T06:27:22.469Z"
}
```

## Speech-to-Text Endpoints

### POST /api/stt

Convert audio to text using HuggingFace Whisper Large v3 Turbo.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `audio` (file): Audio file (WAV, MP3, FLAC, OGG, WebM, M4A)
  - `language` (optional): Language code (default: "en")
  - `maxRetries` (optional): Number of retry attempts (default: 3)

**Response:**
```json
{
  "transcription": "Hello, I'm feeling anxious today.",
  "confidence": 1.0,
  "language": "en",
  "fileSize": 1024000,
  "processingTime": 2500
}
```

**Errors:**
- 400: No audio file provided, invalid file type, or file too large
- 413: File exceeds 25MB limit
- 500: Speech-to-text processing failed

### GET /api/stt/info

Get information about the STT service.

**Response:**
```json
{
  "service": "Speech-to-Text",
  "model": "openai/whisper-large-v3-turbo",
  "supportedFormats": ["wav", "mp3", "flac", "ogg", "webm", "m4a"],
  "maxFileSize": "25MB",
  "supportedLanguages": ["en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"],
  "endpoint": "/api/stt"
}
```

## Therapy Conversation Endpoints

### POST /api/therapy

Handle CBT conversation with sentiment analysis and context.

**Request:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "I've been feeling really anxious about my job interview tomorrow.",
  "sessionId": "optional-session-uuid",
  "userName": "Optional User Name"
}
```

**Response:**
```json
{
  "response": "I understand you're feeling anxious about your interview. That's completely normal. Can you tell me what specific thoughts are going through your mind about it?",
  "emotion": "anxious",
  "emotionConfidence": 0.85,
  "sessionId": "550e8400-e29b-41d4-a716-446655440001",
  "goal": "Practice deep breathing exercises before the interview",
  "therapeuticRecommendations": [
    "Practice grounding techniques",
    "Challenge catastrophic thinking",
    "Use breathing exercises"
  ],
  "context": {
    "recentSessionsCount": 2,
    "activeGoalsCount": 1,
    "emotionIntensity": "high"
  }
}
```

**Errors:**
- 400: Missing required fields or invalid user ID format
- 404: User not found
- 500: Conversation generation failed

### GET /api/therapy/info

Get information about the therapy service.

**Response:**
```json
{
  "service": "CBT Therapy Conversation",
  "conversationModel": "meta-llama/Llama-3.1-8B-Instruct",
  "sentimentModel": "j-hartmann/emotion-english-distilroberta-base",
  "features": [
    "Cognitive Behavioral Therapy techniques",
    "Sentiment analysis and mood adaptation",
    "Session memory and context",
    "Goal generation and tracking",
    "Therapeutic recommendations"
  ],
  "supportedEmotions": ["happy", "sad", "angry", "anxious", "surprised", "disgusted", "neutral"],
  "endpoint": "/api/therapy"
}
```

## Text-to-Speech Endpoints

### POST /api/tts

Convert text to speech (fallback service when browser TTS unavailable).

**Request:**
```json
{
  "text": "Hello, how are you feeling today?",
  "voice": "optional-voice-preference",
  "speed": 1.0
}
```

**Response:**
- Content-Type: `audio/wav`
- Body: Audio stream

**Errors:**
- 400: Missing text or text too long (>1000 characters)
- 500: Text-to-speech processing failed

### GET /api/tts/info

Get information about the TTS service.

**Response:**
```json
{
  "service": "Text-to-Speech (Fallback)",
  "model": "hexgrad/Kokoro-82M",
  "maxTextLength": 1000,
  "supportedLanguages": ["en"],
  "fallbackOnly": true,
  "browserTTSAvailable": false,
  "note": "This service is used as fallback when browser Web Speech API is unavailable",
  "recommendation": "Use browser Web Speech API for better performance and lower latency",
  "endpoint": "/api/tts"
}
```

### GET /api/tts/browser-check

Check if browser TTS is available.

**Response:**
```json
{
  "browserTTSAvailable": false,
  "availableVoices": [],
  "recommendation": "Use fallback TTS service"
}
```

## Session Management Endpoints

### GET /api/sessions/:userId

Get sessions for a specific user.

**Parameters:**
- `userId` (path): User UUID
- `limit` (query, optional): Number of sessions to return (1-100, default: 10)
- `offset` (query, optional): Number of sessions to skip (default: 0)

**Response:**
```json
{
  "sessions": [
    {
      "id": "session-uuid",
      "user_id": "user-uuid",
      "date": "2025-08-16T06:27:22.469Z",
      "transcript": "User: Hello\nNuma: Hi there!",
      "summary": "Initial greeting session",
      "emotion": "neutral",
      "duration_minutes": 15,
      "status": "completed"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "count": 1
  },
  "statistics": {
    "totalSessions": 5,
    "completedSessions": 4,
    "averageDuration": 18.5,
    "mostCommonEmotion": "anxious"
  }
}
```

### POST /api/sessions

Create a new session.

**Request:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "transcript": "Initial transcript",
  "emotion": "neutral"
}
```

**Response:**
```json
{
  "session": {
    "id": "new-session-uuid",
    "user_id": "user-uuid",
    "date": "2025-08-16T06:27:22.469Z",
    "transcript": "Initial transcript",
    "emotion": "neutral",
    "status": "active"
  },
  "message": "Session created successfully"
}
```

### GET /api/sessions/session/:sessionId

Get a specific session by ID.

**Response:**
```json
{
  "session": {
    "id": "session-uuid",
    "user_id": "user-uuid",
    "date": "2025-08-16T06:27:22.469Z",
    "transcript": "Full session transcript",
    "summary": "Session summary",
    "emotion": "anxious",
    "duration_minutes": 20,
    "status": "completed"
  }
}
```

### PUT /api/sessions/:sessionId

Update a session.

**Request:**
```json
{
  "transcript": "Updated transcript",
  "summary": "Updated summary",
  "emotion": "happy",
  "status": "completed",
  "durationMinutes": 25
}
```

**Response:**
```json
{
  "session": {
    "id": "session-uuid",
    "user_id": "user-uuid",
    "transcript": "Updated transcript",
    "summary": "Updated summary",
    "emotion": "happy",
    "status": "completed",
    "duration_minutes": 25
  },
  "message": "Session updated successfully"
}
```

### POST /api/sessions/:sessionId/complete

Complete a session with summary and emotion.

**Request:**
```json
{
  "summary": "User discussed anxiety management techniques",
  "emotion": "anxious",
  "durationMinutes": 20
}
```

**Response:**
```json
{
  "session": {
    "id": "session-uuid",
    "status": "completed",
    "summary": "User discussed anxiety management techniques",
    "emotion": "anxious",
    "duration_minutes": 20
  },
  "message": "Session completed successfully"
}
```

### DELETE /api/sessions/:sessionId

Delete a session.

**Response:**
```json
{
  "message": "Session deleted successfully"
}
```

## Common Error Codes

- **400 Bad Request**: Invalid input, missing required fields, or malformed data
- **404 Not Found**: Resource not found (user, session, etc.)
- **413 Payload Too Large**: File upload exceeds size limits
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side processing error
- **503 Service Unavailable**: External service (HuggingFace API) unavailable

## Request/Response Headers

### Common Request Headers
- `Content-Type`: `application/json` or `multipart/form-data`
- `User-Agent`: Client identification

### Common Response Headers
- `Content-Type`: `application/json` or `audio/wav`
- `X-RateLimit-Limit`: Rate limit maximum
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Rate limit reset time
- `Access-Control-Allow-Origin`: CORS header

## Development Notes

1. **Database**: Uses Supabase PostgreSQL with row-level security
2. **AI Models**: HuggingFace Inference API for all AI operations
3. **File Uploads**: Handled via multer with memory storage
4. **Logging**: Comprehensive request/response logging
5. **Validation**: Input validation and sanitization on all endpoints
6. **Error Handling**: Consistent error response format across all endpoints

## Testing

Use the provided test scripts:
- `npm run test` - Run Jest test suite
- `npx ts-node src/test-api-endpoints.ts` - Test all endpoints
- `npm run db:health` - Check database connectivity
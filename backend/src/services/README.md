# HuggingFace API Integration Services

This directory contains the HuggingFace API integration services for the Numa AI therapist application.

## Services Overview

### HuggingFaceClient
- **Purpose**: Central client wrapper for HuggingFace API authentication and connection management
- **Model**: N/A (client wrapper)
- **Features**: 
  - API key management
  - Connection testing
  - Error handling

### SpeechToTextService
- **Purpose**: Convert audio input to text transcription
- **Model**: OpenAI Whisper Large v3 Turbo (0.8B parameters)
- **Features**:
  - Audio format validation (WAV, MP3, FLAC, OGG, WebM, M4A)
  - Retry logic with exponential backoff
  - Size limits (25MB max)
  - Multi-language support

### ConversationService
- **Purpose**: Generate CBT-based therapeutic responses
- **Model**: Meta Llama 3.1 8B Instruct
- **Features**:
  - CBT-focused system prompts
  - Emotion-adaptive responses
  - Goal extraction from conversations
  - Session context integration
  - Retry logic with fallback responses

### TextToSpeechService
- **Purpose**: Fallback text-to-speech when browser TTS unavailable
- **Model**: Kokoro 82M
- **Features**:
  - Browser TTS detection
  - Fallback to HuggingFace TTS
  - Text length validation (1000 chars max)
  - Audio format conversion

### SentimentAnalysisService
- **Purpose**: Analyze user emotions from text input
- **Model**: j-hartmann/emotion-english-distilroberta-base
- **Features**:
  - Emotion detection (happy, sad, anxious, angry, etc.)
  - Confidence scoring
  - Therapeutic recommendations based on emotions
  - Distress level assessment

## Usage Examples

### Basic Speech-to-Text
```typescript
import { speechToTextService } from './services';

const audioBuffer = new ArrayBuffer(1024); // Your audio data
const result = await speechToTextService.transcribeAudio(audioBuffer);

if (result.error) {
  console.error('STT failed:', result.error);
} else {
  console.log('Transcription:', result.transcription);
}
```

### CBT Conversation
```typescript
import { conversationService } from './services';

const context = {
  userId: 'user-123',
  detectedEmotion: 'anxious',
  sessionHistory: ['Previous session summary'],
  activeGoals: ['Practice mindfulness']
};

const result = await conversationService.generateResponse(
  'I feel worried about tomorrow',
  context
);

console.log('Numa response:', result.response);
if (result.suggestedGoal) {
  console.log('New goal:', result.suggestedGoal);
}
```

### Sentiment Analysis
```typescript
import { sentimentAnalysisService } from './services';

const result = await sentimentAnalysisService.analyzeSentiment(
  'I feel really anxious about my presentation tomorrow'
);

console.log('Detected emotion:', result.emotion);
console.log('Confidence:', result.confidence);

const recommendations = sentimentAnalysisService.getTherapeuticRecommendations(
  result.emotion,
  result.confidence
);
console.log('Therapeutic approach:', recommendations);
```

## Error Handling

All services implement comprehensive error handling with:

- **Retry Logic**: Exponential backoff for transient failures
- **Non-Retryable Errors**: Authentication, quota, and rate limit errors
- **Fallback Responses**: Graceful degradation when APIs fail
- **Input Validation**: Size limits and format checking
- **Logging**: Detailed error logging for debugging

## Configuration

Services are configured via environment variables:

```bash
HUGGINGFACE_API_KEY=your_api_key_here
```

## Cost Optimization

The services implement several cost optimization strategies:

1. **Model Selection**: Using smaller, efficient models (0.8B-8B parameters)
2. **Request Caching**: Avoiding duplicate API calls
3. **Rate Limiting**: Preventing API overuse
4. **Input Validation**: Rejecting oversized requests
5. **Browser TTS Priority**: Using free browser TTS before fallback

## Testing

Run the service tests with:

```bash
npm test -- --testPathPatterns=services
```

Tests cover:
- Service initialization
- Input validation
- Error handling
- Retry logic
- Integration scenarios

## Models Used

| Service | Model | Parameters | Purpose |
|---------|-------|------------|---------|
| STT | OpenAI Whisper Large v3 Turbo | 0.8B | Speech recognition |
| Conversation | Meta Llama 3.1 8B Instruct | 8B | CBT therapy chat |
| TTS | Kokoro 82M | 82M | Speech synthesis (fallback) |
| Sentiment | emotion-english-distilroberta-base | 125M | Emotion detection |

All models are accessed via HuggingFace Inference API for cost-effective deployment.
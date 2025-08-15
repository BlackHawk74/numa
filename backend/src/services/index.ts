// HuggingFace API Integration Services
export { HuggingFaceClient, huggingFaceClient } from './HuggingFaceClient';
export { SpeechToTextService, speechToTextService } from './SpeechToTextService';
export { ConversationService, conversationService } from './ConversationService';
export { TextToSpeechService, textToSpeechService } from './TextToSpeechService';
export { SentimentAnalysisService, sentimentAnalysisService } from './SentimentAnalysisService';

// Type exports
export type { STTResult, STTOptions } from './SpeechToTextService';
export type { ConversationContext, ConversationResult, ConversationOptions } from './ConversationService';
export type { TTSResult, TTSOptions } from './TextToSpeechService';
export type { SentimentResult, SentimentOptions } from './SentimentAnalysisService';
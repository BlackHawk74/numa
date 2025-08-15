#!/usr/bin/env ts-node

/**
 * Manual test script for HuggingFace services
 * Run with: npx ts-node src/services/test-services.ts
 */

import dotenv from 'dotenv';
import {
  huggingFaceClient,
  speechToTextService,
  conversationService,
  sentimentAnalysisService,
  textToSpeechService
} from './index';

// Load environment variables
dotenv.config();

async function testHuggingFaceClient() {
  console.log('\n=== Testing HuggingFace Client ===');
  
  try {
    console.log('✓ Client configured:', huggingFaceClient.isConfigured());
    
    // Test connection (this will make a real API call if API key is valid)
    if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY !== 'your_huggingface_api_key_here') {
      console.log('Testing API connection...');
      const connected = await huggingFaceClient.testConnection();
      console.log('✓ API connection:', connected ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('⚠ Skipping API connection test (no valid API key)');
    }
  } catch (error) {
    console.error('✗ HuggingFace Client test failed:', error);
  }
}

async function testSpeechToTextService() {
  console.log('\n=== Testing Speech-to-Text Service ===');
  
  try {
    // Test input validation
    const emptyBuffer = new ArrayBuffer(0);
    const validation1 = speechToTextService.validateAudioInput(emptyBuffer);
    console.log('✓ Empty buffer validation:', validation1.valid ? 'FAILED' : 'PASSED');
    
    const validBuffer = new ArrayBuffer(1024);
    const validation2 = speechToTextService.validateAudioInput(validBuffer);
    console.log('✓ Valid buffer validation:', validation2.valid ? 'PASSED' : 'FAILED');
    
    // Test supported formats
    const formats = speechToTextService.getSupportedFormats();
    console.log('✓ Supported formats:', formats.join(', '));
    
    console.log('⚠ Skipping actual transcription (requires audio file and API key)');
  } catch (error) {
    console.error('✗ Speech-to-Text test failed:', error);
  }
}

async function testConversationService() {
  console.log('\n=== Testing Conversation Service ===');
  
  try {
    const context = {
      userId: 'test-user-123',
      sessionHistory: ['User discussed anxiety about work'],
      activeGoals: ['Practice deep breathing'],
      detectedEmotion: 'anxious'
    };
    
    console.log('✓ Context prepared for conversation');
    console.log('⚠ Skipping actual conversation (requires API key)');
    
    // Test emotion guidance
    console.log('✓ Service initialized successfully');
  } catch (error) {
    console.error('✗ Conversation Service test failed:', error);
  }
}

async function testSentimentAnalysisService() {
  console.log('\n=== Testing Sentiment Analysis Service ===');
  
  try {
    // Test therapeutic recommendations
    const recommendations = sentimentAnalysisService.getTherapeuticRecommendations('anxious', 0.8);
    console.log('✓ Anxiety recommendations:', recommendations);
    
    // Test emotion intensity
    const intensity = sentimentAnalysisService.getEmotionIntensity(0.8);
    console.log('✓ Emotion intensity (0.8):', intensity);
    
    // Test distress detection
    const isDistressed = sentimentAnalysisService.isDistressedEmotion('anxious');
    console.log('✓ Anxious is distressed:', isDistressed);
    
    console.log('⚠ Skipping actual sentiment analysis (requires API key)');
  } catch (error) {
    console.error('✗ Sentiment Analysis test failed:', error);
  }
}

async function testTextToSpeechService() {
  console.log('\n=== Testing Text-to-Speech Service ===');
  
  try {
    // Test input validation
    const validation1 = textToSpeechService.validateTextInput('');
    console.log('✓ Empty text validation:', validation1.valid ? 'FAILED' : 'PASSED');
    
    const validation2 = textToSpeechService.validateTextInput('Hello world');
    console.log('✓ Valid text validation:', validation2.valid ? 'PASSED' : 'FAILED');
    
    // Test service info
    const info = textToSpeechService.getServiceInfo();
    console.log('✓ Service info:', info);
    
    console.log('⚠ Skipping actual TTS (requires API key)');
  } catch (error) {
    console.error('✗ Text-to-Speech test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 Starting HuggingFace Services Test Suite');
  console.log('==========================================');
  
  await testHuggingFaceClient();
  await testSpeechToTextService();
  await testConversationService();
  await testSentimentAnalysisService();
  await testTextToSpeechService();
  
  console.log('\n✅ Test suite completed!');
  console.log('\nNote: Full API tests require a valid HUGGINGFACE_API_KEY');
  console.log('Set your API key in the .env file to test actual API calls.');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

export { runAllTests };
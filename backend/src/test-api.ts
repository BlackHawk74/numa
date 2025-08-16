import express from 'express';
import request from 'supertest';
import { initializeDatabase } from './database';

// Import the app
import app from './index';

/**
 * Simple test script to verify API endpoints are working
 */
async function testAPI() {
  try {
    console.log('Testing API endpoints...');

    // Test health endpoint
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await request(app).get('/health');
    console.log('Health status:', healthResponse.status);
    console.log('Health body:', healthResponse.body);

    // Test STT info endpoint
    console.log('\n2. Testing STT info endpoint...');
    const sttInfoResponse = await request(app).get('/api/stt/info');
    console.log('STT info status:', sttInfoResponse.status);
    console.log('STT info body:', sttInfoResponse.body);

    // Test therapy info endpoint
    console.log('\n3. Testing therapy info endpoint...');
    const therapyInfoResponse = await request(app).get('/api/therapy/info');
    console.log('Therapy info status:', therapyInfoResponse.status);
    console.log('Therapy info body:', therapyInfoResponse.body);

    // Test TTS info endpoint
    console.log('\n4. Testing TTS info endpoint...');
    const ttsInfoResponse = await request(app).get('/api/tts/info');
    console.log('TTS info status:', ttsInfoResponse.status);
    console.log('TTS info body:', ttsInfoResponse.body);

    // Test TTS browser check endpoint
    console.log('\n5. Testing TTS browser check endpoint...');
    const ttsBrowserResponse = await request(app).get('/api/tts/browser-check');
    console.log('TTS browser check status:', ttsBrowserResponse.status);
    console.log('TTS browser check body:', ttsBrowserResponse.body);

    // Test 404 handling
    console.log('\n6. Testing 404 handling...');
    const notFoundResponse = await request(app).get('/api/nonexistent');
    console.log('404 status:', notFoundResponse.status);
    console.log('404 body:', notFoundResponse.body);

    console.log('\n✅ API endpoint tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAPI();
}

export { testAPI };
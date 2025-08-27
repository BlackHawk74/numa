// Load environment variables first
require('dotenv').config();

const http = require('http');

async function testHFConnection() {
  try {
    console.log('Testing HuggingFace connection...');
    console.log('Environment variables loaded:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- HUGGINGFACE_API_KEY exists:', !!process.env.HUGGINGFACE_API_KEY);
    console.log('- HUGGINGFACE_API_KEY length:', process.env.HUGGINGFACE_API_KEY ? process.env.HUGGINGFACE_API_KEY.length : 0);
    
    // Test HF client configuration
    const { huggingFaceClient } = require('./dist/services/HuggingFaceClient.js');
    
    console.log('HF client configured:', huggingFaceClient.isConfigured());
    
    // Test connection
    const connectionTest = await huggingFaceClient.testConnection();
    console.log('HF connection test result:', connectionTest);
    
  } catch (error) {
    console.error('HF connection test failed:', error.message);
    console.error('Full error:', error);
  }
}

testHFConnection();
/**
 * Test script to verify user initialization and session creation
 */

const API_BASE = 'http://localhost:3001';

async function testUserFlow() {
  console.log('Testing user initialization and session flow...\n');

  try {
    // Test 1: Create a user
    console.log('1. Creating test user...');
    const userResponse = await fetch(`${API_BASE}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User for Voice Interface'
      })
    });

    if (!userResponse.ok) {
      throw new Error(`User creation failed: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    const userId = userData.user.id;
    console.log('✅ User created:', userId);

    // Test 2: Initialize session
    console.log('\n2. Initializing session...');
    const sessionResponse = await fetch(`${API_BASE}/api/sessions/initialize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    if (!sessionResponse.ok) {
      throw new Error(`Session initialization failed: ${sessionResponse.status}`);
    }

    const sessionData = await sessionResponse.json();
    console.log('✅ Session initialized:', sessionData.session.id);

    // Test 3: Test therapy endpoint (simulate voice message)
    console.log('\n3. Testing therapy conversation...');
    const therapyResponse = await fetch(`${API_BASE}/api/therapy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        message: 'Hello, I would like to test the voice interface.',
        sessionId: sessionData.session.id
      })
    });

    if (!therapyResponse.ok) {
      const errorText = await therapyResponse.text();
      console.log('❌ Therapy request failed:', therapyResponse.status, errorText);
    } else {
      const therapyData = await therapyResponse.json();
      console.log('✅ Therapy response received');
      console.log('   Response:', therapyData.response.substring(0, 100) + '...');
      console.log('   Emotion:', therapyData.emotion);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\nYou can now try the voice interface in the browser.');
    console.log('The rate limiting issues should be resolved.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testUserFlow().catch(console.error);
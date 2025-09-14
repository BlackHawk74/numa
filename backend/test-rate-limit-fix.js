/**
 * Test script to verify rate limiting fixes
 */

const API_BASE = 'http://localhost:3001';

async function testRateLimit() {
  console.log('Testing rate limiting fixes...\n');

  // Test 1: Health check (should always work)
  console.log('1. Testing health check...');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log('✅ Health check:', data.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Multiple rapid requests to expensive endpoint
  console.log('\n2. Testing rapid requests to expensive endpoint...');
  const promises = [];
  
  for (let i = 0; i < 5; i++) {
    promises.push(
      fetch(`${API_BASE}/api/therapy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'test-user-123',
          message: `Test message ${i + 1}`
        })
      }).then(async (response) => {
        const status = response.status;
        const text = await response.text();
        return { request: i + 1, status, success: response.ok, response: text };
      }).catch(error => ({
        request: i + 1,
        status: 'ERROR',
        success: false,
        error: error.message
      }))
    );
  }

  const results = await Promise.all(promises);
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} Request ${result.request}: ${result.status} ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (!result.success && result.status === 429) {
      console.log('   Rate limited (expected for some requests)');
    }
  });

  // Test 3: Check rate limit headers
  console.log('\n3. Testing rate limit headers...');
  try {
    const response = await fetch(`${API_BASE}/api/therapy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'test-user-123',
        message: 'Header test message'
      })
    });

    console.log('Rate limit headers:');
    console.log('  X-RateLimit-Limit:', response.headers.get('X-RateLimit-Limit'));
    console.log('  X-RateLimit-Remaining:', response.headers.get('X-RateLimit-Remaining'));
    console.log('  X-RateLimit-Reset:', response.headers.get('X-RateLimit-Reset'));
    console.log('  X-Cache:', response.headers.get('X-Cache'));
  } catch (error) {
    console.log('❌ Header test failed:', error.message);
  }

  console.log('\nRate limiting test completed!');
}

// Run the test
testRateLimit().catch(console.error);
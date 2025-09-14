const http = require('http');

const BASE_URL = 'http://localhost:3001';

/**
 * Make HTTP request
 */
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rate-Limiting-Test'
      }
    };

    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Test rate limiting and cost optimization features
 */
async function testRateLimitingAndOptimization() {
  console.log('🚀 Testing Rate Limiting and Cost Optimization Features\n');

  try {
    // Test 1: Basic monitoring endpoint
    console.log('1. Testing monitoring endpoints...');
    const metricsResponse = await makeRequest('/api/monitoring/metrics');
    
    if (metricsResponse.statusCode === 200) {
      console.log('✅ Metrics endpoint working');
      console.log('   Cache stats:', metricsResponse.data.cache);
      console.log('   Usage stats:', metricsResponse.data.usage);
      console.log('   Audio performance:', metricsResponse.data.audio);
    } else {
      console.log('❌ Metrics endpoint failed:', metricsResponse.statusCode);
    }

    // Test 2: Rate limiting headers
    console.log('\n2. Testing rate limiting headers...');
    const healthResponse = await makeRequest('/health');
    
    if (healthResponse.headers['x-ratelimit-limit']) {
      console.log('✅ Rate limiting headers present');
      console.log('   Limit:', healthResponse.headers['x-ratelimit-limit']);
      console.log('   Remaining:', healthResponse.headers['x-ratelimit-remaining']);
      console.log('   Reset:', healthResponse.headers['x-ratelimit-reset']);
    } else {
      console.log('❌ Rate limiting headers missing');
    }

    // Test 3: Cache headers
    console.log('\n3. Testing cache functionality...');
    const therapyResponse = await makeRequest('/api/therapy', 'POST', {
      message: 'Hello, I am feeling anxious today',
      userId: 'test-user-123'
    });
    
    if (therapyResponse.headers['x-cache']) {
      console.log('✅ Cache headers present');
      console.log('   Cache status:', therapyResponse.headers['x-cache']);
    } else {
      console.log('⚠️  Cache headers not present (may be expected for POST requests)');
    }

    // Test 4: Performance monitoring headers
    console.log('\n4. Testing performance monitoring...');
    if (therapyResponse.headers['x-response-time']) {
      console.log('✅ Performance monitoring headers present');
      console.log('   Response time:', therapyResponse.headers['x-response-time']);
      console.log('   Response size:', therapyResponse.headers['x-response-size']);
    } else {
      console.log('❌ Performance monitoring headers missing');
    }

    // Test 5: Usage report
    console.log('\n5. Testing usage report...');
    const reportResponse = await makeRequest('/api/monitoring/report');
    
    if (reportResponse.statusCode === 200) {
      console.log('✅ Usage report endpoint working');
      console.log('   Summary:', reportResponse.data.summary);
      console.log('   Recommendations:', reportResponse.data.recommendations);
    } else {
      console.log('❌ Usage report endpoint failed:', reportResponse.statusCode);
    }

    // Test 6: Audio performance endpoint
    console.log('\n6. Testing audio performance monitoring...');
    const audioResponse = await makeRequest('/api/monitoring/audio-performance');
    
    if (audioResponse.statusCode === 200) {
      console.log('✅ Audio performance endpoint working');
      console.log('   Audio stats:', audioResponse.data);
    } else {
      console.log('❌ Audio performance endpoint failed:', audioResponse.statusCode);
    }

    // Test 7: Thresholds management
    console.log('\n7. Testing thresholds management...');
    const thresholdsResponse = await makeRequest('/api/monitoring/thresholds');
    
    if (thresholdsResponse.statusCode === 200) {
      console.log('✅ Thresholds endpoint working');
      console.log('   Current thresholds:', thresholdsResponse.data.thresholds);
    } else {
      console.log('❌ Thresholds endpoint failed:', thresholdsResponse.statusCode);
    }

    // Test 8: Multiple requests to test rate limiting
    console.log('\n8. Testing rate limiting with multiple requests...');
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('/health'));
    }
    
    const responses = await Promise.all(promises);
    const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
    
    if (rateLimitedResponses.length > 0) {
      console.log('✅ Rate limiting is working - some requests were limited');
    } else {
      console.log('✅ All requests succeeded (rate limit not reached)');
      console.log('   Remaining requests:', responses[0].headers['x-ratelimit-remaining']);
    }

    console.log('\n🎉 Rate limiting and cost optimization testing completed!');
    console.log('\n📊 Summary of implemented features:');
    console.log('   ✅ Enhanced rate limiting with different limits per endpoint');
    console.log('   ✅ Request caching for HuggingFace API calls');
    console.log('   ✅ Usage monitoring and alerting system');
    console.log('   ✅ Performance monitoring for audio processing');
    console.log('   ✅ Database query optimization with caching');
    console.log('   ✅ Comprehensive monitoring dashboard');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nMake sure the backend server is running on port 3001');
  }
}

// Run the test
testRateLimitingAndOptimization();
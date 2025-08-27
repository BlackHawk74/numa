const http = require('http');

async function testTherapyAPI() {
  try {
    console.log('Testing Therapy API endpoint...');
    
    // Test therapy info endpoint first
    const infoResponse = await makeRequest('GET', '/api/therapy/info');
    console.log('Therapy info status:', infoResponse.status);
    if (infoResponse.status === 200) {
      console.log('Therapy service info:', JSON.parse(infoResponse.body));
    }
    
    // Test a simple therapy message
    const testMessage = {
      userId: '123e4567-e89b-12d3-a456-426614174000', // Valid UUID format
      message: 'Hello, I am feeling a bit anxious today.'
    };
    
    console.log('\nTesting therapy conversation...');
    const therapyResponse = await makeRequest('POST', '/api/therapy', JSON.stringify(testMessage));
    console.log('Therapy response status:', therapyResponse.status);
    console.log('Therapy response body:', therapyResponse.body);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data,
          headers: res.headers
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

testTherapyAPI();
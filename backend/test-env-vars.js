const http = require('http');

async function testEnvVars() {
  try {
    console.log('Testing environment variables endpoint...');
    
    // Test env vars endpoint
    const response = await makeRequest('GET', '/health');
    console.log('Health endpoint status:', response.status);
    
    // Let's check if we can access the HF key through a test endpoint
    console.log('\nEnvironment check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('HUGGINGFACE_API_KEY exists:', !!process.env.HUGGINGFACE_API_KEY);
    console.log('HUGGINGFACE_API_KEY length:', process.env.HUGGINGFACE_API_KEY ? process.env.HUGGINGFACE_API_KEY.length : 0);
    
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

testEnvVars();
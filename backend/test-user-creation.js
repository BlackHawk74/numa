const http = require('http');

async function testUserCreation() {
  try {
    console.log('Testing User Creation and Therapy Flow...');
    
    // Step 1: Create a user
    console.log('\n1. Creating a new user...');
    const createUserResponse = await makeRequest('POST', '/api/users', JSON.stringify({
      name: 'Test User',
      preferences: {}
    }));
    
    console.log('Create user status:', createUserResponse.status);
    console.log('Create user response:', createUserResponse.body);
    
    if (createUserResponse.status !== 201) {
      console.error('Failed to create user');
      return;
    }
    
    const userData = JSON.parse(createUserResponse.body);
    const userId = userData.user.id;
    console.log('Created user ID:', userId);
    
    // Step 2: Test therapy conversation with the created user
    console.log('\n2. Testing therapy conversation with created user...');
    const testMessage = {
      userId: userId,
      message: 'Hello, I am feeling a bit anxious today.'
    };
    
    const therapyResponse = await makeRequest('POST', '/api/therapy', JSON.stringify(testMessage));
    console.log('Therapy response status:', therapyResponse.status);
    console.log('Therapy response body:', therapyResponse.body);
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error('Full error:', error);
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

testUserCreation();
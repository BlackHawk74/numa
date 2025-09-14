const http = require('http');

async function testFrontendAPI() {
  try {
    console.log('Testing frontend API connection...');
    
    // Test user creation
    const postData = JSON.stringify({
      name: 'Frontend Test User',
      preferences: {}
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/users',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
    
    console.log('✅ User creation successful!');
    console.log('Status:', response.status);
    console.log('User ID:', response.data.user.id);
    console.log('User Name:', response.data.user.name);
    
  } catch (error) {
    console.error('❌ API test failed:');
    console.error('Error:', error.message);
  }
}

testFrontendAPI();
const https = require('https');

// Test the Render API server connection
const options = {
  hostname: 'kiongozi-api.onrender.com',
  port: 443,
  path: '/api/v1/health',
  method: 'GET',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Origin': 'http://localhost:3000',
    'Content-Type': 'application/json'
  }
};

console.log('Testing Render API server connection...');
console.log('URL: https://kiongozi-api.onrender.com/api/v1/health');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
    try {
      const parsed = JSON.parse(data);
      console.log('Parsed JSON:', parsed);
    } catch (e) {
      console.log('Response is not JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.end();
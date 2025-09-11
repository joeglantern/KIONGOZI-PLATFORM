const https = require('https');

// Test chat endpoint
const data = JSON.stringify({
  text: "Hello, this is a test message"
});

const options = {
  hostname: 'kiongozi-api.onrender.com',
  port: 443,
  path: '/api/v1/chat/message',
  method: 'POST',
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Origin': 'http://localhost:3000',
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log('Testing chat API endpoint...');
console.log('URL: https://kiongozi-api.onrender.com/api/v1/chat/message');

const req = https.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  
  let responseData = '';
  res.on('data', (chunk) => {
    responseData += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', responseData);
    try {
      const parsed = JSON.parse(responseData);
      console.log('Parsed JSON:', parsed);
    } catch (e) {
      console.log('Response is not JSON');
    }
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
});

req.write(data);
req.end();
const http = require('http');

// Test the full chatbot flow through the proxy
async function testChatbotFlow() {
  console.log('🤖 Testing Chatbot Flow with API Proxy...\n');

  // Test 1: Health check through proxy
  console.log('1. Testing health endpoint through proxy...');
  try {
    const healthResponse = await makeRequest('/api-proxy/health', 'GET');
    console.log('✅ Health check:', healthResponse.status, healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Conversations endpoint (should require auth)
  console.log('\n2. Testing conversations endpoint...');
  try {
    const conversationsResponse = await makeRequest('/api-proxy/chat/conversations', 'GET');
    console.log('✅ Conversations:', conversationsResponse.status, conversationsResponse.data);
  } catch (error) {
    console.log('❌ Conversations failed:', error.message);
  }

  // Test 3: Send a chat message (should require auth)
  console.log('\n3. Testing chat message endpoint...');
  try {
    const messageData = JSON.stringify({ text: 'Hello, test message from API proxy!' });
    const messageResponse = await makeRequest('/api-proxy/chat/message', 'POST', messageData);
    console.log('✅ Chat message:', messageResponse.status, messageResponse.data);
  } catch (error) {
    console.log('❌ Chat message failed:', error.message);
  }

  console.log('\n🔍 Summary: If you see 401 (Unauthorized) for chat endpoints, that means the proxy is working correctly but needs authentication tokens from your frontend.');
}

function makeRequest(path, method, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Client/1.0'
      }
    };

    if (data) {
      options.headers['Content-Length'] = Buffer.byteLength(data);
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
            status: res.statusCode,
            data: parsedData
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

// Run the test
testChatbotFlow().catch(console.error);

// Usage: node test-chatbot-flow.js
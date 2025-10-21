const http = require('http');

// Test with real token from browser
async function testWithRealToken() {
  console.log('🔍 Testing with real Supabase token...\n');
  
  // You'll need to copy this from your browser's localStorage or network tab
  // Look for: localStorage.getItem('sb-jdncfyagppohtksogzkx-auth-token')
  // Or check the Authorization header in browser dev tools Network tab
  
  console.log('📋 To get your real token:');
  console.log('1. Open browser dev tools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Run: localStorage.getItem("sb-jdncfyagppohtksogzkx-auth-token")');
  console.log('4. Copy the "access_token" value from the JSON result');
  console.log('5. Or check Network tab for Authorization header in any request\n');
  
  // For now, test that the endpoint structure is working
  const testResponse = await makeRequest('/api-proxy/chat/conversations', 'GET', null, 'PASTE_YOUR_TOKEN_HERE');
  console.log('Response (with placeholder token):', testResponse);
  
  console.log('\n💡 Replace "PASTE_YOUR_TOKEN_HERE" with your actual token and run again');
}

function makeRequest(path, method, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Kiongozi-Frontend/1.0'
      }
    };

    if (token && token !== 'PASTE_YOUR_TOKEN_HERE') {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

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

testWithRealToken().catch(console.error);

// API token testing script
// Usage: node test-real-token.js
// Replace 'PASTE_YOUR_TOKEN_HERE' with your actual Supabase access token to test authenticatif ed requests.
// don't expose your env variables and openai API keys in this file or git repo!




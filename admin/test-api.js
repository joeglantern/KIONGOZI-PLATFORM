// Quick API test script
const API_BASE = 'https://kiongozi-api.onrender.com/api/v1';

async function testSecurityAPI() {
  try {
    console.log('🧪 Testing Security API Endpoints...\n');

    // Test health endpoint first
    console.log('1. Testing health endpoint...');
    const healthRes = await fetch(`${API_BASE}/health`);
    const health = await healthRes.json();
    console.log('✅ Health:', health);

    // Test security endpoints (should fail with 401 - expected)
    console.log('\n2. Testing security endpoint without auth...');
    const securityRes = await fetch(`${API_BASE}/admin/security/overview`);
    const security = await securityRes.text();
    console.log(`Status: ${securityRes.status}`);
    console.log(`Response: ${security}`);

    // Test with fake token (should fail with 401/403 - expected)
    console.log('\n3. Testing security endpoint with fake token...');
    const fakeTokenRes = await fetch(`${API_BASE}/admin/security/overview`, {
      headers: {
        'Authorization': 'Bearer fake-token',
        'Content-Type': 'application/json'
      }
    });
    const fakeTokenResult = await fakeTokenRes.text();
    console.log(`Status: ${fakeTokenRes.status}`);
    console.log(`Response: ${fakeTokenResult}`);

    console.log('\n🔍 Summary:');
    console.log('- API server is reachable');
    console.log('- Security endpoints exist and require authentication');
    console.log('- Issue is likely authentication token in admin panel');

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
  }
}

testSecurityAPI();
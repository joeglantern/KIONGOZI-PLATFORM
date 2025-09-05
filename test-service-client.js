const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseServiceClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function testServiceClient() {
  const userId = '7f732087-672f-49f0-ac48-2214cd8b890b';
  
  console.log('🔍 Testing service client connection...');
  console.log('🔍 URL:', supabaseUrl);
  console.log('🔍 Service key (first 20 chars):', supabaseServiceKey.substring(0, 20) + '...');
  
  try {
    // Test 1: Get profile with single()
    console.log('\n📋 Test 1: Query with .single()');
    const { data: profile, error } = await supabaseServiceClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    console.log('Profile result:', { profile, error });
    
    // Test 2: Get profile without single()
    console.log('\n📋 Test 2: Query without .single()');
    const { data: profiles, error: error2 } = await supabaseServiceClient
      .from('profiles')
      .select('*')
      .eq('id', userId);
      
    console.log('Profiles result:', { profiles, error: error2 });
    
    // Test 3: Get all profiles
    console.log('\n📋 Test 3: Get all profiles');
    const { data: allProfiles, error: error3 } = await supabaseServiceClient
      .from('profiles')
      .select('*')
      .limit(5);
      
    console.log('All profiles result:', { count: allProfiles?.length, error: error3, first: allProfiles?.[0] });
    
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

testServiceClient();
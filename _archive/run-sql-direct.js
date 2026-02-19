const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' }
});

async function checkSchema() {
  console.log('🔍 Checking profiles table schema...\n');

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('✅ Profiles table columns:');
    console.log(Object.keys(data[0]));
    console.log('\n📊 Sample data:');
    console.table(data);
  } else {
    console.log('⚠️  No data in profiles table');
  }

  // Try to call existing functions
  console.log('\n🧪 Testing get_top_learners function...\n');

  const { data: learners, error: learnersError } = await supabase
    .rpc('get_top_learners', { limit_count: 10 });

  if (learnersError) {
    console.error('❌ Error calling get_top_learners:', learnersError.message);
  } else {
    console.log('✅ Top Learners:');
    console.table(learners);
  }
}

checkSchema();

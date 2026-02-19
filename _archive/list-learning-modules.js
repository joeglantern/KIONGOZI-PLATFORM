const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listModules() {
  const { data: modules } = await supabase
    .from('learning_modules')
    .select('id, title, estimated_duration_minutes')
    .order('title');

  console.log('=== ALL LEARNING MODULES ===\n');
  modules?.forEach((m, i) => {
    console.log(`${i + 1}. ${m.title} (${m.estimated_duration_minutes} min)`);
    console.log(`   ID: ${m.id}`);
    console.log('');
  });

  console.log(`Total: ${modules?.length || 0} modules`);
}

listModules();

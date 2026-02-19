import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkQuizzes() {
  console.log('Checking all modules with "Assessment", "Quiz", or "Test" in title...\n');

  const { data: modules } = await supabase
    .from('learning_modules')
    .select('id, title, created_at')
    .or('title.ilike.%assessment%,title.ilike.%quiz%,title.ilike.%test%')
    .order('created_at', { ascending: false });

  if (modules) {
    console.log(`Found ${modules.length} quiz/assessment modules:\n`);
    modules.forEach(m => {
      console.log(`- ${m.title}`);
      console.log(`  ID: ${m.id}`);
      console.log(`  Created: ${new Date(m.created_at).toLocaleString()}\n`);
    });
  }

  // Check specific IDs from the script output
  const specificIds = [
    'ba32dd80-41d5-433c-9c1e-c66d9e47d5f1',
    'e75a8079-b4ff-4eab-a5c6-8f581c78c376',
    'c1efe447-269b-4d69-a18d-108ce6146d89'
  ];

  console.log('\nChecking specific quiz IDs from script output:\n');
  for (const id of specificIds) {
    const { data: module } = await supabase
      .from('learning_modules')
      .select('id, title')
      .eq('id', id)
      .single();

    if (module) {
      console.log(`✅ ${module.title} (${module.id})`);
    } else {
      console.log(`❌ Not found: ${id}`);
    }
  }
}

checkQuizzes();

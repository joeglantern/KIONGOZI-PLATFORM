const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listAllCourses() {
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, status')
    .order('title');

  console.log('=== ALL COURSES IN DATABASE ===\n');
  courses?.forEach((c, i) => {
    console.log(`${i + 1}. ${c.title}`);
    console.log(`   ID: ${c.id}`);
    console.log(`   Status: ${c.status}`);
    console.log('');
  });

  console.log(`Total: ${courses?.length || 0} courses`);
}

listAllCourses();

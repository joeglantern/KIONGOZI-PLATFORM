const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCourseModules() {
  const courseId = '2ac6c8b7-60a2-4ccc-b763-f135d001c097'; // Data Analytics with Python

  console.log('=== DATA ANALYTICS WITH PYTHON ===');
  console.log('Course ID:', courseId);

  // Check course_modules table
  const { data: courseModules, error } = await supabase
    .from('course_modules')
    .select(`
      id,
      order_index,
      learning_modules(id, title, estimated_duration_minutes)
    `)
    .eq('course_id', courseId)
    .order('order_index');

  console.log('\nModules in course_modules table:', courseModules?.length || 0);

  if (courseModules && courseModules.length > 0) {
    console.log('\nModule list:');
    courseModules.forEach((cm, i) => {
      console.log(`  ${i + 1}. ${cm.learning_modules?.title || 'Unknown'} (${cm.learning_modules?.estimated_duration_minutes || 0} min)`);
    });
  } else {
    console.log('\n❌ NO MODULES FOUND! This course has no modules linked to it.');
    console.log('\nTo fix this, you need to:');
    console.log('1. Create learning modules in the "learning_modules" table');
    console.log('2. Link them to this course via the "course_modules" table');
  }

  // Check if there are any learning modules that COULD be linked
  const { data: allModules } = await supabase
    .from('learning_modules')
    .select('id, title')
    .limit(10);

  console.log(`\nTotal learning modules in database: ${allModules?.length || 0}`);
}

checkCourseModules();

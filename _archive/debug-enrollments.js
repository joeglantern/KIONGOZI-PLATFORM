const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function debug() {
  try {
    // Check Data Analytics course
    console.log('=== DATA ANALYTICS COURSE ===');
    const { data: dataAnalytics } = await supabase
      .from('courses')
      .select('id, title, module_count')
      .ilike('title', '%Data Analytics%')
      .single();

    console.log('Course:', dataAnalytics);

    if (dataAnalytics) {
      // Check modules
      const { data: modules } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', dataAnalytics.id);

      console.log('Module count from course_modules table:', modules?.length || 0);
    }

    console.log('\n=== ALL ENROLLMENTS ===');
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select(`
        course_id,
        progress_percentage,
        courses(id, title)
      `);

    if (enrollments && enrollments.length > 0) {
      enrollments.forEach((e, i) => {
        console.log(`${i + 1}. Course ID: ${e.course_id}`);
        console.log(`   Title: ${e.courses?.title || 'NOT FOUND'}`);
        console.log(`   Progress: ${e.progress_percentage}%`);
        console.log('');
      });
    } else {
      console.log('No enrollments found in database');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

debug();

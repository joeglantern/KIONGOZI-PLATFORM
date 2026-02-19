const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkCourse() {
  try {
    // Find Data Analytics with Python course
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .ilike('title', '%Data Analytics with Python%');

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return;
    }

    if (!courses || courses.length === 0) {
      console.log('❌ Course "Data Analytics with Python" not found');
      return;
    }

    const course = courses[0];
    console.log('✅ Course found:', course);

    // Check if it has modules
    const { data: courseModules, error: moduleError } = await supabase
      .from('course_modules')
      .select(`
        id,
        order_index,
        learning_modules(id, title)
      `)
      .eq('course_id', course.id)
      .order('order_index');

    if (moduleError) {
      console.error('Error fetching modules:', moduleError);
      return;
    }

    console.log('\n📚 Number of modules:', courseModules?.length || 0);

    if (courseModules && courseModules.length > 0) {
      console.log('\nModules:');
      courseModules.forEach((cm, index) => {
        console.log(`  ${index + 1}. ${cm.learning_modules?.title || 'Unknown'}`);
      });
    } else {
      console.log('⚠️  No modules found for this course!');
    }

    // Check enrollments
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', course.id);

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return;
    }

    console.log('\n👥 Number of enrollments:', enrollments?.length || 0);
    if (enrollments && enrollments.length > 0) {
      enrollments.forEach((e) => {
        console.log(`  - User ${e.user_id}: ${e.progress_percentage}% complete`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkCourse();

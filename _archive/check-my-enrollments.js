const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkEnrollments() {
  try {
    // Get user by email
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('❌ Not authenticated or user not found');
      console.log('Please log in first in the browser, then run this script');
      return;
    }

    console.log('✅ Logged in as:', user.email);
    console.log('User ID:', user.id);

    // Get all enrollments for this user
    const { data: enrollments, error: enrollError } = await supabase
      .from('course_enrollments')
      .select(`
        *,
        courses(id, title)
      `)
      .eq('user_id', user.id);

    if (enrollError) {
      console.error('Error fetching enrollments:', enrollError);
      return;
    }

    console.log('\n📚 Total Enrollments:', enrollments?.length || 0);

    if (enrollments && enrollments.length > 0) {
      console.log('\nYour Enrolled Courses:');
      enrollments.forEach((e, index) => {
        console.log(`\n${index + 1}. ${e.courses?.title || 'Unknown Course'}`);
        console.log(`   Course ID: ${e.course_id}`);
        console.log(`   Progress: ${e.progress_percentage}%`);
        console.log(`   Status: ${e.status}`);
        console.log(`   Enrolled: ${new Date(e.enrolled_at).toLocaleDateString()}`);
      });

      // Check modules for each course
      for (const enrollment of enrollments) {
        const { data: modules } = await supabase
          .from('course_modules')
          .select('id')
          .eq('course_id', enrollment.course_id);

        console.log(`   Modules: ${modules?.length || 0}`);
      }
    } else {
      console.log('\n⚠️  No enrollments found');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkEnrollments();

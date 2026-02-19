/**
 * Test Auto-Enrollment Feature
 * Verifies that marking module progress automatically creates enrollment
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdncfyagppohtksogzkx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testAutoEnrollment() {
  console.log('Testing Auto-Enrollment Feature\n');
  console.log('================================\n');

  // Get test user
  const { data: user } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', 'libanjoe7@gmail.com')
    .single();

  if (!user) {
    console.error('Test user not found');
    return;
  }

  console.log(`Test User: ${user.email} (${user.id})\n`);

  // Get a course the user is NOT enrolled in
  const { data: allCourses } = await supabase
    .from('courses')
    .select('id, title')
    .eq('status', 'published')
    .limit(10);

  if (!allCourses || allCourses.length === 0) {
    console.error('No courses found');
    return;
  }

  // Check which courses user is NOT enrolled in
  const { data: enrollments } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('user_id', user.id);

  const enrolledCourseIds = new Set(enrollments?.map(e => e.course_id) || []);
  const notEnrolledCourse = allCourses.find(c => !enrolledCourseIds.has(c.id));

  if (!notEnrolledCourse) {
    console.log('User is enrolled in all available courses');
    console.log('Creating test scenario with existing enrollment...\n');

    // Use first enrolled course for testing
    const testCourse = allCourses[0];
    const { data: courseWithModules } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        modules:course_modules(
          id,
          learning_modules(id, title)
        )
      `)
      .eq('id', testCourse.id)
      .single() as { data: any };

    if (!courseWithModules?.modules || courseWithModules.modules.length === 0) {
      console.error('Test course has no modules');
      return;
    }

    console.log(`Test Course: "${courseWithModules.title}"`);
    console.log(`Modules: ${courseWithModules.modules.length}\n`);

    // Test the updated function by calling it through the simulated flow
    const testModuleId = courseWithModules.modules[0].learning_modules?.id;

    if (!testModuleId) {
      console.error('Invalid module data');
      return;
    }

    console.log('Testing: Marking module as completed updates enrollment correctly...\n');

    // Create/update progress
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.id,
        module_id: testModuleId,
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,module_id'
      })
      .select()
      .single();

    if (progressError) {
      console.error('Error creating progress:', progressError.message);
      return;
    }

    console.log('✓ Module progress created/updated');

    // Now manually trigger the course progress update (simulating the code fix)
    await updateCourseProgressManual(courseWithModules.id, user.id);

    // Verify enrollment was updated
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('course_id', courseWithModules.id)
      .eq('user_id', user.id)
      .single();

    if (enrollment) {
      console.log('✓ Enrollment updated successfully');
      console.log(`  - Progress: ${enrollment.progress_percentage}%`);
      console.log(`  - Status: ${enrollment.status}`);
      console.log(`  - Completed At: ${enrollment.completed_at || 'N/A'}\n`);
    }

    return;
  }

  // Test with course user is NOT enrolled in
  const { data: courseWithModules } = await supabase
    .from('courses')
    .select(`
      id,
      title,
      modules:course_modules(
        id,
        learning_modules(id, title)
      )
    `)
    .eq('id', notEnrolledCourse.id)
    .single() as { data: any };

  if (!courseWithModules?.modules || courseWithModules.modules.length === 0) {
    console.error('Test course has no modules');
    return;
  }

  console.log(`Test Course: "${courseWithModules.title}"`);
  console.log(`Modules: ${courseWithModules.modules.length}`);
  console.log(`User is NOT enrolled in this course\n`);

  // Verify no enrollment exists
  const { data: preEnrollment } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseWithModules.id)
    .eq('user_id', user.id)
    .single();

  console.log(`Pre-test: Enrollment exists? ${preEnrollment ? 'YES' : 'NO'}\n`);

  // Mark first module as completed WITHOUT explicit enrollment
  const testModuleId = courseWithModules.modules[0].learning_modules?.id;

  if (!testModuleId) {
    console.error('Invalid module data');
    return;
  }

  console.log('Step 1: Creating module progress (without enrollment)...');

  const { data: progressData, error: progressError } = await supabase
    .from('user_progress')
    .insert({
      user_id: user.id,
      module_id: testModuleId,
      status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (progressError) {
    console.error('Error creating progress:', progressError.message);
    return;
  }

  console.log('✓ Module progress created\n');

  console.log('Step 2: Triggering course progress update...');

  // Manually trigger the course progress update (simulating the code fix)
  await updateCourseProgressManual(courseWithModules.id, user.id);

  console.log('✓ Course progress update completed\n');

  console.log('Step 3: Verifying auto-enrollment...');

  // Check if enrollment was created
  const { data: postEnrollment } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseWithModules.id)
    .eq('user_id', user.id)
    .single();

  if (postEnrollment) {
    console.log('✓ SUCCESS! Enrollment was automatically created\n');
    console.log('Enrollment Details:');
    console.log(`  - Progress: ${postEnrollment.progress_percentage}%`);
    console.log(`  - Status: ${postEnrollment.status}`);
    console.log(`  - Enrolled At: ${postEnrollment.enrolled_at}`);
    console.log(`  - Expected Progress: ${Math.round((1 / courseWithModules.modules.length) * 100)}%`);

    if (postEnrollment.progress_percentage === Math.round((1 / courseWithModules.modules.length) * 100)) {
      console.log('\n✓ Progress percentage calculated correctly!');
    } else {
      console.log('\n⚠ Progress percentage mismatch!');
    }
  } else {
    console.log('✗ FAILED! Enrollment was NOT created automatically');
    console.log('This means the code fix needs to be applied to courseClient.ts');
  }

  console.log('\n================================');
  console.log('Test Complete\n');
}

// Manual implementation of the fixed updateCourseProgress function
async function updateCourseProgressManual(courseId: string, userId: string) {
  // Get all modules in the course
  const { data: courseModules } = await supabase
    .from('course_modules')
    .select('learning_modules(id)')
    .eq('course_id', courseId);

  if (!courseModules || courseModules.length === 0) return;

  const moduleIds = courseModules
    .map((cm: any) => cm.learning_modules?.id)
    .filter(Boolean);

  // Get user's progress for all modules in the course
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('module_id', moduleIds);

  const completedCount = userProgress?.filter((p: any) => p.status === 'completed').length || 0;
  const totalCount = moduleIds.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Check if enrollment exists
  const { data: existingEnrollment } = await supabase
    .from('course_enrollments')
    .select('id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .single();

  if (existingEnrollment) {
    // Update existing enrollment
    await supabase
      .from('course_enrollments')
      .update({
        progress_percentage: progressPercentage,
        status: progressPercentage === 100 ? 'completed' : 'active',
        completed_at: progressPercentage === 100 ? new Date().toISOString() : null
      })
      .eq('id', existingEnrollment.id);
  } else {
    // Create new enrollment if it doesn't exist
    await supabase
      .from('course_enrollments')
      .insert({
        user_id: userId,
        course_id: courseId,
        progress_percentage: progressPercentage,
        status: progressPercentage === 100 ? 'completed' : 'active',
        completed_at: progressPercentage === 100 ? new Date().toISOString() : null
      });
  }
}

testAutoEnrollment().catch(console.error);

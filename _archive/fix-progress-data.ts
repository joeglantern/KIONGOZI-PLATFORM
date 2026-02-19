/**
 * Fix Progress Data Script
 * Recalculates and fixes all course progress percentages
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdncfyagppohtksogzkx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixProgressData() {
  console.log('Starting progress data fix...\n');

  // Get all enrollments
  const { data: enrollments, error: enrollError } = await supabase
    .from('course_enrollments')
    .select(`
      id,
      user_id,
      course_id,
      progress_percentage,
      status,
      course:courses(
        id,
        title,
        modules:course_modules(
          id,
          learning_modules(id)
        )
      )
    `);

  if (enrollError) {
    console.error('Error fetching enrollments:', enrollError);
    return;
  }

  console.log(`Found ${enrollments?.length || 0} enrollments to check\n`);

  let fixedCount = 0;
  let alreadyCorrect = 0;
  let errors = 0;

  for (const enrollment of enrollments || []) {
    const course = enrollment.course as any;
    if (!course || !course.modules) {
      console.log(`⚠ Enrollment ${enrollment.id}: No course/modules data, skipping`);
      continue;
    }

    const moduleIds = course.modules
      .map((m: any) => m.learning_modules?.id)
      .filter(Boolean);

    if (moduleIds.length === 0) {
      console.log(`⚠ Course "${course.title}": No modules, skipping`);
      continue;
    }

    // Get user's progress for all modules in this course
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', enrollment.user_id)
      .in('module_id', moduleIds);

    const completedCount = userProgress?.filter((p: any) => p.status === 'completed').length || 0;
    const totalCount = moduleIds.length;
    const correctPercentage = Math.round((completedCount / totalCount) * 100);
    const correctStatus = correctPercentage === 100 ? 'completed' : 'active';

    if (enrollment.progress_percentage === correctPercentage && enrollment.status === correctStatus) {
      alreadyCorrect++;
      console.log(`✓ "${course.title}": Already correct (${correctPercentage}%)`);
      continue;
    }

    // Fix the enrollment
    const { error: updateError } = await supabase
      .from('course_enrollments')
      .update({
        progress_percentage: correctPercentage,
        status: correctStatus,
        completed_at: correctPercentage === 100 ? new Date().toISOString() : null
      })
      .eq('id', enrollment.id);

    if (updateError) {
      console.error(`✗ Error fixing "${course.title}":`, updateError.message);
      errors++;
    } else {
      console.log(`✓ Fixed "${course.title}": ${enrollment.progress_percentage}% → ${correctPercentage}% (${completedCount}/${totalCount} modules)`);
      fixedCount++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('SUMMARY:');
  console.log(`Total Enrollments: ${enrollments?.length || 0}`);
  console.log(`Already Correct: ${alreadyCorrect}`);
  console.log(`Fixed: ${fixedCount}`);
  console.log(`Errors: ${errors}`);
  console.log('═══════════════════════════════════════\n');
}

fixProgressData().catch(console.error);

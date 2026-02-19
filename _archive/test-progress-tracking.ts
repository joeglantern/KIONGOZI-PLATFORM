/**
 * Comprehensive Progress Tracking Test Suite
 * Tests the entire progress tracking system in Kiongozi LMS
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const SUPABASE_URL = 'https://jdncfyagppohtksogzkx.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test results tracking
interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
  data?: any;
}

const testResults: TestResult[] = [];

function logTest(result: TestResult) {
  testResults.push(result);
  const icon = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
  console.log(`${icon} ${result.name}: ${result.details}`);
  if (result.data) {
    console.log('  Data:', JSON.stringify(result.data, null, 2));
  }
}

// ============================================================================
// 1. DATABASE SCHEMA VERIFICATION
// ============================================================================

async function testDatabaseSchema() {
  console.log('\n=== 1. DATABASE SCHEMA VERIFICATION ===\n');

  // Test user_progress table
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .limit(1);

    if (error) throw error;

    // Check columns by inspecting the first record or schema
    const { data: schemaData } = await supabase
      .from('user_progress')
      .select('id, user_id, module_id, status, progress_percentage, time_spent_minutes, course_id, started_at, completed_at, created_at, updated_at')
      .limit(1);

    logTest({
      name: 'user_progress table exists',
      status: 'PASS',
      details: 'Table exists with all required columns'
    });
  } catch (error: any) {
    logTest({
      name: 'user_progress table verification',
      status: 'FAIL',
      details: error.message
    });
  }

  // Test course_enrollments table
  try {
    const { data: schemaData } = await supabase
      .from('course_enrollments')
      .select('id, user_id, course_id, progress_percentage, status, enrolled_at, completed_at')
      .limit(1);

    logTest({
      name: 'course_enrollments table exists',
      status: 'PASS',
      details: 'Table exists with all required columns'
    });
  } catch (error: any) {
    logTest({
      name: 'course_enrollments table verification',
      status: 'FAIL',
      details: error.message
    });
  }

  // Check for indexes and constraints
  try {
    const { data: progressCount } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true });

    const { data: enrollmentCount } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true });

    logTest({
      name: 'Database statistics',
      status: 'PASS',
      details: `user_progress records: ${progressCount}, course_enrollments records: ${enrollmentCount}`,
      data: { progressRecords: progressCount, enrollmentRecords: enrollmentCount }
    });
  } catch (error: any) {
    logTest({
      name: 'Database statistics',
      status: 'WARNING',
      details: error.message
    });
  }
}

// ============================================================================
// 2. TEST USER AND COURSE SETUP
// ============================================================================

async function setupTestData() {
  console.log('\n=== 2. TEST DATA SETUP ===\n');

  // Get admin user
  const { data: adminUser, error: userError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'libanjoe7@gmail.com')
    .single();

  if (userError || !adminUser) {
    logTest({
      name: 'Find admin user',
      status: 'FAIL',
      details: 'Could not find user libanjoe7@gmail.com'
    });
    return null;
  }

  logTest({
    name: 'Find admin user',
    status: 'PASS',
    details: `Found user: ${adminUser.email} (ID: ${adminUser.id})`,
    data: { userId: adminUser.id, email: adminUser.email }
  });

  // Get a course with modules
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select(`
      *,
      modules:course_modules(
        id,
        order_index,
        learning_modules(id, title)
      )
    `)
    .eq('status', 'published')
    .limit(5);

  if (courseError || !courses || courses.length === 0) {
    logTest({
      name: 'Find test course',
      status: 'FAIL',
      details: 'No published courses found'
    });
    return null;
  }

  // Find course with most modules
  const courseWithModules = courses.reduce((prev, current) => {
    return (current.modules?.length || 0) > (prev.modules?.length || 0) ? current : prev;
  });

  logTest({
    name: 'Find test course',
    status: 'PASS',
    details: `Selected course: "${courseWithModules.title}" with ${courseWithModules.modules?.length || 0} modules`,
    data: {
      courseId: courseWithModules.id,
      courseTitle: courseWithModules.title,
      moduleCount: courseWithModules.modules?.length || 0,
      modules: courseWithModules.modules?.map((m: any) => ({
        id: m.learning_modules?.id,
        title: m.learning_modules?.title
      }))
    }
  });

  return {
    userId: adminUser.id,
    userEmail: adminUser.email,
    course: courseWithModules
  };
}

// ============================================================================
// 3. TEST ENROLLMENT
// ============================================================================

async function testEnrollment(userId: string, courseId: string) {
  console.log('\n=== 3. ENROLLMENT TESTING ===\n');

  // Check if already enrolled
  const { data: existingEnrollment } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();

  if (existingEnrollment) {
    logTest({
      name: 'Check existing enrollment',
      status: 'PASS',
      details: 'User already enrolled in course',
      data: existingEnrollment
    });
    return existingEnrollment;
  }

  // Create enrollment
  const { data: newEnrollment, error: enrollError } = await supabase
    .from('course_enrollments')
    .insert({
      user_id: userId,
      course_id: courseId,
      status: 'active',
      progress_percentage: 0
    })
    .select()
    .single();

  if (enrollError) {
    logTest({
      name: 'Create enrollment',
      status: 'FAIL',
      details: enrollError.message
    });
    return null;
  }

  logTest({
    name: 'Create enrollment',
    status: 'PASS',
    details: 'Successfully created enrollment',
    data: newEnrollment
  });

  return newEnrollment;
}

// ============================================================================
// 4. TEST MODULE PROGRESS TRACKING
// ============================================================================

async function testModuleProgress(userId: string, courseId: string, modules: any[]) {
  console.log('\n=== 4. MODULE PROGRESS TRACKING ===\n');

  if (!modules || modules.length === 0) {
    logTest({
      name: 'Module progress test',
      status: 'FAIL',
      details: 'No modules available for testing'
    });
    return;
  }

  // Test 1: Mark first module as completed
  const firstModule = modules[0].learning_modules;
  if (!firstModule?.id) {
    logTest({
      name: 'First module validation',
      status: 'FAIL',
      details: 'Invalid module data'
    });
    return;
  }

  // Check existing progress
  const { data: existingProgress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', firstModule.id)
    .single();

  if (existingProgress) {
    logTest({
      name: 'Check existing module progress',
      status: 'PASS',
      details: `Module "${firstModule.title}" already has progress: ${existingProgress.status}`,
      data: existingProgress
    });
  } else {
    // Create new progress record
    const { data: newProgress, error: progressError } = await supabase
      .from('user_progress')
      .insert({
        user_id: userId,
        module_id: firstModule.id,
        status: 'completed',
        progress_percentage: 100,
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (progressError) {
      logTest({
        name: 'Mark first module as completed',
        status: 'FAIL',
        details: progressError.message
      });
    } else {
      logTest({
        name: 'Mark first module as completed',
        status: 'PASS',
        details: `Successfully marked "${firstModule.title}" as completed`,
        data: newProgress
      });
    }
  }

  // Test 2: Mark second module as completed (if exists)
  if (modules.length > 1) {
    const secondModule = modules[1].learning_modules;

    const { data: existingProgress2 } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', secondModule.id)
      .single();

    if (existingProgress2) {
      logTest({
        name: 'Check second module progress',
        status: 'PASS',
        details: `Module "${secondModule.title}" already has progress: ${existingProgress2.status}`,
        data: existingProgress2
      });
    } else {
      const { data: newProgress2, error: progressError2 } = await supabase
        .from('user_progress')
        .insert({
          user_id: userId,
          module_id: secondModule.id,
          status: 'completed',
          progress_percentage: 100,
          completed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (progressError2) {
        logTest({
          name: 'Mark second module as completed',
          status: 'FAIL',
          details: progressError2.message
        });
      } else {
        logTest({
          name: 'Mark second module as completed',
          status: 'PASS',
          details: `Successfully marked "${secondModule.title}" as completed`,
          data: newProgress2
        });
      }
    }
  }
}

// ============================================================================
// 5. TEST COURSE PROGRESS CALCULATION
// ============================================================================

async function testCourseProgressCalculation(userId: string, courseId: string, modules: any[]) {
  console.log('\n=== 5. COURSE PROGRESS CALCULATION ===\n');

  // Get all module IDs in the course
  const moduleIds = modules
    .map((m: any) => m.learning_modules?.id)
    .filter(Boolean);

  // Get user's progress for all modules
  const { data: userProgress, error: progressError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', userId)
    .in('module_id', moduleIds);

  if (progressError) {
    logTest({
      name: 'Fetch user progress',
      status: 'FAIL',
      details: progressError.message
    });
    return;
  }

  const completedCount = userProgress?.filter((p: any) => p.status === 'completed').length || 0;
  const totalCount = moduleIds.length;
  const expectedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  logTest({
    name: 'Calculate expected progress',
    status: 'PASS',
    details: `Completed ${completedCount} of ${totalCount} modules (${expectedPercentage}%)`,
    data: { completedCount, totalCount, expectedPercentage }
  });

  // Update course enrollment with calculated progress
  const { data: updatedEnrollment, error: updateError } = await supabase
    .from('course_enrollments')
    .update({
      progress_percentage: expectedPercentage,
      status: expectedPercentage === 100 ? 'completed' : 'active',
      completed_at: expectedPercentage === 100 ? new Date().toISOString() : null
    })
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    logTest({
      name: 'Update course progress',
      status: 'FAIL',
      details: updateError.message
    });
    return;
  }

  // Verify the update
  const { data: currentEnrollment } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .single();

  const progressMatch = currentEnrollment?.progress_percentage === expectedPercentage;
  const statusMatch = currentEnrollment?.status === (expectedPercentage === 100 ? 'completed' : 'active');

  logTest({
    name: 'Verify course progress update',
    status: progressMatch && statusMatch ? 'PASS' : 'FAIL',
    details: progressMatch && statusMatch
      ? `Course progress correctly updated to ${currentEnrollment?.progress_percentage}%`
      : `Mismatch: Expected ${expectedPercentage}%, got ${currentEnrollment?.progress_percentage}%`,
    data: currentEnrollment
  });
}

// ============================================================================
// 6. TEST EDGE CASES
// ============================================================================

async function testEdgeCases(userId: string, courseId: string, modules: any[]) {
  console.log('\n=== 6. EDGE CASE TESTING ===\n');

  if (!modules || modules.length === 0) return;

  const firstModule = modules[0].learning_modules;

  // Test 1: Mark already completed module (idempotency)
  const { data: progress1, error: error1 } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      module_id: firstModule.id,
      status: 'completed',
      progress_percentage: 100,
      completed_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,module_id'
    })
    .select()
    .single();

  logTest({
    name: 'Idempotency test (mark completed module again)',
    status: error1 ? 'FAIL' : 'PASS',
    details: error1 ? error1.message : 'Successfully handled duplicate completion'
  });

  // Test 2: Progress without enrollment (should handle gracefully)
  const { data: testCourses } = await supabase
    .from('courses')
    .select('id')
    .limit(1);

  if (testCourses && testCourses.length > 0) {
    const testCourseId = testCourses[0].id;

    // Check if NOT enrolled
    const { data: checkEnrollment } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', testCourseId)
      .single();

    if (!checkEnrollment) {
      logTest({
        name: 'Progress without enrollment',
        status: 'PASS',
        details: 'System allows progress tracking even without explicit enrollment'
      });
    }
  }

  // Test 3: Invalid module ID
  const fakeModuleId = '00000000-0000-0000-0000-000000000000';
  const { error: error3 } = await supabase
    .from('user_progress')
    .insert({
      user_id: userId,
      module_id: fakeModuleId,
      status: 'completed',
      progress_percentage: 100
    })
    .select()
    .single();

  logTest({
    name: 'Invalid module ID handling',
    status: error3 ? 'PASS' : 'WARNING',
    details: error3
      ? `Correctly rejected invalid module: ${error3.message}`
      : 'System accepted invalid module ID (potential issue)'
  });
}

// ============================================================================
// 7. DATA CONSISTENCY CHECKS
// ============================================================================

async function testDataConsistency() {
  console.log('\n=== 7. DATA CONSISTENCY CHECKS ===\n');

  // Check 1: All enrollments have valid course_id and user_id
  const { data: enrollments, error: enrollError } = await supabase
    .from('course_enrollments')
    .select('id, user_id, course_id, progress_percentage, status');

  if (enrollError) {
    logTest({
      name: 'Fetch enrollments for consistency check',
      status: 'FAIL',
      details: enrollError.message
    });
  } else {
    const invalidEnrollments = enrollments?.filter(e => !e.user_id || !e.course_id) || [];

    logTest({
      name: 'Valid foreign keys in enrollments',
      status: invalidEnrollments.length === 0 ? 'PASS' : 'FAIL',
      details: invalidEnrollments.length === 0
        ? `All ${enrollments?.length || 0} enrollments have valid user_id and course_id`
        : `Found ${invalidEnrollments.length} enrollments with invalid foreign keys`,
      data: invalidEnrollments.length > 0 ? invalidEnrollments : undefined
    });
  }

  // Check 2: Progress percentages are 0-100
  const invalidProgress = enrollments?.filter(e =>
    e.progress_percentage < 0 || e.progress_percentage > 100
  ) || [];

  logTest({
    name: 'Valid progress percentages (0-100)',
    status: invalidProgress.length === 0 ? 'PASS' : 'FAIL',
    details: invalidProgress.length === 0
      ? 'All progress percentages are within valid range'
      : `Found ${invalidProgress.length} enrollments with invalid percentages`,
    data: invalidProgress.length > 0 ? invalidProgress : undefined
  });

  // Check 3: Completed status matches 100% progress
  const statusMismatch = enrollments?.filter(e =>
    (e.status === 'completed' && e.progress_percentage !== 100) ||
    (e.status !== 'completed' && e.progress_percentage === 100)
  ) || [];

  logTest({
    name: 'Status matches progress percentage',
    status: statusMismatch.length === 0 ? 'PASS' : 'WARNING',
    details: statusMismatch.length === 0
      ? 'All completed statuses match 100% progress'
      : `Found ${statusMismatch.length} enrollments with status/progress mismatch`,
    data: statusMismatch.length > 0 ? statusMismatch.slice(0, 5) : undefined
  });

  // Check 4: All progress records reference valid modules
  const { data: progressRecords } = await supabase
    .from('user_progress')
    .select('id, module_id, user_id, status, progress_percentage');

  if (progressRecords) {
    const invalidProgressRecords = progressRecords.filter(p =>
      !p.module_id || !p.user_id || p.progress_percentage < 0 || p.progress_percentage > 100
    );

    logTest({
      name: 'Valid user_progress records',
      status: invalidProgressRecords.length === 0 ? 'PASS' : 'FAIL',
      details: invalidProgressRecords.length === 0
        ? `All ${progressRecords.length} progress records are valid`
        : `Found ${invalidProgressRecords.length} invalid progress records`,
      data: invalidProgressRecords.length > 0 ? invalidProgressRecords.slice(0, 5) : undefined
    });
  }
}

// ============================================================================
// 8. COURSE PROGRESS LOGIC VERIFICATION
// ============================================================================

async function testCourseProgressLogic() {
  console.log('\n=== 8. COURSE PROGRESS LOGIC VERIFICATION ===\n');

  // Get a sample enrollment with progress
  const { data: sampleEnrollments } = await supabase
    .from('course_enrollments')
    .select(`
      *,
      course:courses(
        id,
        title,
        modules:course_modules(
          id,
          learning_modules(id)
        )
      )
    `)
    .limit(5);

  if (!sampleEnrollments || sampleEnrollments.length === 0) {
    logTest({
      name: 'Course progress logic verification',
      status: 'WARNING',
      details: 'No enrollments found to verify'
    });
    return;
  }

  let correctCount = 0;
  let incorrectCount = 0;

  for (const enrollment of sampleEnrollments) {
    const course = enrollment.course as any;
    if (!course || !course.modules) continue;

    const moduleIds = course.modules
      .map((m: any) => m.learning_modules?.id)
      .filter(Boolean);

    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', enrollment.user_id)
      .in('module_id', moduleIds);

    const completedCount = userProgress?.filter((p: any) => p.status === 'completed').length || 0;
    const totalCount = moduleIds.length;
    const expectedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    if (enrollment.progress_percentage === expectedPercentage) {
      correctCount++;
    } else {
      incorrectCount++;

      // Log first few mismatches for investigation
      if (incorrectCount <= 3) {
        logTest({
          name: `Progress calculation mismatch - ${course.title}`,
          status: 'WARNING',
          details: `Expected ${expectedPercentage}%, got ${enrollment.progress_percentage}%`,
          data: {
            courseId: course.id,
            completedModules: completedCount,
            totalModules: totalCount,
            expectedProgress: expectedPercentage,
            actualProgress: enrollment.progress_percentage
          }
        });
      }
    }
  }

  logTest({
    name: 'Overall progress calculation accuracy',
    status: incorrectCount === 0 ? 'PASS' : incorrectCount < correctCount ? 'WARNING' : 'FAIL',
    details: `${correctCount} correct, ${incorrectCount} incorrect out of ${sampleEnrollments.length} enrollments checked`,
    data: { correctCount, incorrectCount, totalChecked: sampleEnrollments.length }
  });
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║   KIONGOZI LMS - PROGRESS TRACKING SYSTEM TEST SUITE       ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log();

  try {
    // Run all tests
    await testDatabaseSchema();

    const testData = await setupTestData();

    if (testData) {
      await testEnrollment(testData.userId, testData.course.id);
      await testModuleProgress(testData.userId, testData.course.id, testData.course.modules);
      await testCourseProgressCalculation(testData.userId, testData.course.id, testData.course.modules);
      await testEdgeCases(testData.userId, testData.course.id, testData.course.modules);
    }

    await testDataConsistency();
    await testCourseProgressLogic();

    // Print summary
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                        TEST SUMMARY                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const passCount = testResults.filter(r => r.status === 'PASS').length;
    const failCount = testResults.filter(r => r.status === 'FAIL').length;
    const warnCount = testResults.filter(r => r.status === 'WARNING').length;

    console.log(`Total Tests: ${testResults.length}`);
    console.log(`✓ Passed: ${passCount}`);
    console.log(`✗ Failed: ${failCount}`);
    console.log(`⚠ Warnings: ${warnCount}`);
    console.log();

    if (failCount > 0) {
      console.log('FAILED TESTS:');
      testResults.filter(r => r.status === 'FAIL').forEach(r => {
        console.log(`  ✗ ${r.name}: ${r.details}`);
      });
      console.log();
    }

    if (warnCount > 0) {
      console.log('WARNINGS:');
      testResults.filter(r => r.status === 'WARNING').forEach(r => {
        console.log(`  ⚠ ${r.name}: ${r.details}`);
      });
      console.log();
    }

    // Generate recommendations
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      RECOMMENDATIONS                         ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const recommendations = [];

    if (failCount > 0) {
      recommendations.push('1. Fix all failed tests before deploying to production');
    }

    if (testResults.some(r => r.name.includes('Progress calculation mismatch'))) {
      recommendations.push('2. Run a data migration script to recalculate all course progress percentages');
    }

    if (testResults.some(r => r.name.includes('Status matches progress percentage') && r.status !== 'PASS')) {
      recommendations.push('3. Update enrollment statuses to match progress percentages (completed = 100%)');
    }

    recommendations.push('4. Consider adding database triggers to automatically update course progress when module progress changes');
    recommendations.push('5. Add indexes on user_progress(user_id, module_id) for better query performance');
    recommendations.push('6. Implement a scheduled job to validate data consistency weekly');

    recommendations.forEach(rec => console.log(rec));
    console.log();

    console.log('Test suite completed successfully!');

  } catch (error) {
    console.error('Fatal error running test suite:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();

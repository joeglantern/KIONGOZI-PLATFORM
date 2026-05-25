/**
 * Force-deletes the 2 leftover garbage courses with enrollments,
 * cleans up the dependent rows in correct FK order:
 *   user_progress → course_enrollments → course_modules → (orphan learning_modules) → courses
 *
 * Targets are pinned by ID to avoid title-match accidents.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const TARGETS = [
  { id: '83d5f29c-fa2d-4d6a-b401-0b527b321032', title: 'Reasl Estate' },
  { id: '83ab2691-8208-4b97-974b-a09365d84934', title: 'Lorem Ipsum (published)' },
];

for (const t of TARGETS) {
  console.log(`\n── Cleaning "${t.title}" (${t.id}) ──`);

  // 1. Collect module_ids attached to this course
  const { data: links } = await supabase
    .from('course_modules')
    .select('module_id')
    .eq('course_id', t.id);
  const moduleIds = (links || []).map(l => l.module_id);
  console.log(`  module_ids on this course: ${moduleIds.length}`);

  // 2. Find which of those modules are used by OTHER (non-deleted) courses → keep those
  let orphanModuleIds = [];
  if (moduleIds.length > 0) {
    const { data: otherUses } = await supabase
      .from('course_modules')
      .select('module_id, course_id')
      .in('module_id', moduleIds)
      .neq('course_id', t.id);
    const shared = new Set((otherUses || []).map(r => r.module_id));
    orphanModuleIds = moduleIds.filter(id => !shared.has(id));
    console.log(`  orphan modules (only this course uses): ${orphanModuleIds.length}`);
  }

  // 3. Delete user_progress rows tied to this course OR its modules
  let progressDeleted = 0;
  {
    const { count: byCourse } = await supabase
      .from('user_progress')
      .delete({ count: 'exact' })
      .eq('course_id', t.id);
    progressDeleted += byCourse || 0;
    if (moduleIds.length > 0) {
      const { count: byModule } = await supabase
        .from('user_progress')
        .delete({ count: 'exact' })
        .in('module_id', moduleIds);
      progressDeleted += byModule || 0;
    }
  }
  console.log(`  user_progress rows deleted: ${progressDeleted}`);

  // 4. Delete enrollments
  const { count: enrDel } = await supabase
    .from('course_enrollments')
    .delete({ count: 'exact' })
    .eq('course_id', t.id);
  console.log(`  course_enrollments deleted: ${enrDel || 0}`);

  // 5. Delete course_modules join rows
  const { count: linkDel } = await supabase
    .from('course_modules')
    .delete({ count: 'exact' })
    .eq('course_id', t.id);
  console.log(`  course_modules links deleted: ${linkDel || 0}`);

  // 6. Delete orphan learning_modules
  if (orphanModuleIds.length > 0) {
    const { count: modDel } = await supabase
      .from('learning_modules')
      .delete({ count: 'exact' })
      .in('id', orphanModuleIds);
    console.log(`  orphan learning_modules deleted: ${modDel || 0}`);
  }

  // 7. Delete the course
  const { error: cErr, count } = await supabase
    .from('courses')
    .delete({ count: 'exact' })
    .eq('id', t.id);
  if (cErr) {
    console.error(`  ✗ Failed to delete course: ${cErr.message}`);
    continue;
  }
  console.log(`  ✓ Course deleted (count=${count})`);
}

console.log('\nDone.');

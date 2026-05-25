import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Explicit ID whitelist — verified manually as garbage test entries.
// Titles for reference; we soft-delete by ID only to avoid title-match accidents.
const GARBAGE = [
  { title: 'bbbbbbbb',                                                  why: 'random keysmash' },
  { title: 'ttttttttttt',                                               why: 'random keysmash' },
  { title: 'hhhhhhhhhhhhhh',                                            why: 'random keysmash' },
  { title: 'Reasl Estate',                                              why: 'typo + empty (0 modules)' },
  { title: 'dcscdsc',                                                   why: 'random keysmash' },
  { title: 'Lorem Ipsum',                                               why: 'placeholder content' },
];
// Note: there are TWO "Lorem Ipsum" rows (one draft, one published with 1 module).
// We'll soft-delete both — they're clearly placeholders.

// Resolve IDs from titles + verify state
const { data: existing, error } = await supabase
  .from('courses')
  .select('id, title, status, deleted_at')
  .in('title', GARBAGE.map(g => g.title))
  .is('deleted_at', null);

if (error) { console.error('Lookup failed:', error); process.exit(1); }

if (existing.length === 0) {
  console.log('No matching garbage courses found (already deleted?). Nothing to do.');
  process.exit(0);
}

console.log('Will soft-delete:');
existing.forEach(c => console.log(`  - ${c.id}  ${c.title}  (${c.status})`));

// Safety: check none have enrollments
for (const c of existing) {
  const { count } = await supabase
    .from('course_enrollments')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', c.id);
  if (count && count > 0) {
    console.warn(`! Course "${c.title}" has ${count} enrollment(s). SKIPPING.`);
    c._skip = true;
  }
}

const toDelete = existing.filter(c => !c._skip).map(c => c.id);
if (toDelete.length === 0) {
  console.log('All garbage rows have enrollments. Nothing safe to delete.');
  process.exit(0);
}

const now = new Date().toISOString();
const { data: updated, error: updErr } = await supabase
  .from('courses')
  .update({ deleted_at: now })
  .in('id', toDelete)
  .select('id, title');

if (updErr) { console.error('Update failed:', updErr); process.exit(1); }

console.log(`\nSoft-deleted ${updated.length} course(s) at ${now}:`);
updated.forEach(c => console.log(`  ✓ ${c.id}  ${c.title}`));

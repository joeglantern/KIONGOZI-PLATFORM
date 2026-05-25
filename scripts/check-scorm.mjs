import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Look for scorm tables
const candidates = ['scorm_packages', 'scorm_modules', 'scorm_attempts', 'scorm_data', 'course_scorm'];
for (const t of candidates) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) console.log(`${t}: NOT FOUND (${error.code})`);
  else console.log(`${t}: ${count} rows`);
}

// Check learning_modules for scorm media_type
const { data: scormModules, count } = await supabase
  .from('learning_modules')
  .select('id, title, media_type, media_url, category_id', { count: 'exact' })
  .or('media_type.eq.scorm,media_url.ilike.%scorm%')
  .limit(20);
console.log(`\nLearning modules with scorm media: ${count}`);
console.log(scormModules);

// Check courses for any scorm-linked field
const { data: cols } = await supabase.from('courses').select('*').limit(1);
console.log('\nCourse columns:', Object.keys(cols[0] || {}));

// Check API routes might use a scorm_packages-like table
// Try common scorm-related names
const more = ['lms_scorm_packages', 'scorm', 'packages'];
for (const t of more) {
  const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
  if (error) console.log(`${t}: NOT FOUND`);
  else console.log(`${t}: ${count} rows`);
}

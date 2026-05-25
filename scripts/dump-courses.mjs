import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: categories } = await supabase
  .from('module_categories')
  .select('id, name, color, icon, display_order')
  .order('display_order');

const { data: courses } = await supabase
  .from('courses')
  .select('id, title, status, review_status, category_id, difficulty_level, estimated_duration_hours, featured, created_at, deleted_at, author_id')
  .order('created_at', { ascending: false });

// For each course, count modules
const courseSummary = [];
for (const c of courses) {
  const { count: moduleCount } = await supabase
    .from('course_modules')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', c.id);
  const cat = categories.find(k => k.id === c.category_id);
  courseSummary.push({ ...c, module_count: moduleCount, category: cat?.name || null });
}

// Storage buckets
const { data: buckets, error: bErr } = await supabase.storage.listBuckets();

console.log('=== CATEGORIES ===');
console.table(categories);
console.log('\n=== COURSES ===');
console.table(courseSummary.map(c => ({
  title: c.title,
  status: c.status,
  review: c.review_status,
  difficulty: c.difficulty_level,
  hrs: c.estimated_duration_hours,
  modules: c.module_count,
  category: c.category,
  deleted: c.deleted_at ? 'YES' : '',
})));
console.log('\n=== STORAGE BUCKETS ===');
if (bErr) console.log('Error:', bErr.message);
else console.table(buckets.map(b => ({ id: b.id, name: b.name, public: b.public, created: b.created_at })));

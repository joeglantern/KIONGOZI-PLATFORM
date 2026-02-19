import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  console.log('📊 Checking Database Data...\n');

  // Check categories
  const { data: categories } = await supabase
    .from('module_categories')
    .select('id, name')
    .order('name');

  console.log('📚 Available Categories:');
  console.log('─'.repeat(50));
  categories?.forEach(cat => console.log(`  - ${cat.name} (${cat.id})`));

  // Check courses
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title')
    .order('title');

  console.log('\n📖 Available Courses:');
  console.log('─'.repeat(50));
  courses?.forEach(course => console.log(`  - ${course.title} (${course.id})`));

  // Check Green Technology course
  const { data: greenCourse } = await supabase
    .from('courses')
    .select('id, title, category_id')
    .eq('id', '611d1c31-b02e-43ca-9064-f294d24b6273')
    .single();

  console.log('\n🌱 Green Technology Foundations Course:');
  console.log('─'.repeat(50));
  if (greenCourse) {
    console.log(`  Title: ${greenCourse.title}`);
    console.log(`  ID: ${greenCourse.id}`);
    console.log(`  Category ID: ${greenCourse.category_id}`);
  } else {
    console.log('  ❌ Course not found!');
  }

  // Check Web Development courses
  const { data: webCourses } = await supabase
    .from('courses')
    .select('id, title')
    .ilike('title', '%web%');

  console.log('\n🌐 Web Development Related Courses:');
  console.log('─'.repeat(50));
  webCourses?.forEach(course => console.log(`  - ${course.title} (${course.id})`));
}

checkData();

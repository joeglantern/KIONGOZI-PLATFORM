const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        console.log('\n📡 Fetching courses...');
        const { data: courses, error: coursesError } = await supabase
            .from('courses')
            .select('*')
            .eq('status', 'published');

        if (coursesError) {
            console.error('❌ Error fetching courses:', coursesError.message);
            console.error('Details:', coursesError);
        } else {
            console.log(`✅ Found ${courses?.length || 0} published courses`);
            if (courses && courses.length > 0) {
                console.log('\nSample course:');
                console.log('- Title:', courses[0].title);
                console.log('- Description:', courses[0].description?.substring(0, 50) + '...');
                console.log('- Difficulty:', courses[0].difficulty_level);
            }
        }

        console.log('\n📡 Fetching categories...');
        const { data: categories, error: categoriesError } = await supabase
            .from('module_categories')
            .select('*');

        if (categoriesError) {
            console.error('❌ Error fetching categories:', categoriesError.message);
            console.error('Details:', categoriesError);
        } else {
            console.log(`✅ Found ${categories?.length || 0} categories`);
            if (categories && categories.length > 0) {
                console.log('Categories:', categories.map(c => c.name).join(', '));
            }
        }

        console.log('\n✅ Connection test complete!');
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
    }
}

testConnection();

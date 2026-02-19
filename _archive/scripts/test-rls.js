const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing if RLS policies are working...\n');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseAnonKey?.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('\n❌ Missing Supabase credentials!');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRLS() {
    try {
        console.log('\n📡 Testing courses query with RLS...');
        const startTime = Date.now();

        const { data, error, status, statusText } = await supabase
            .from('courses')
            .select('*')
            .eq('status', 'published')
            .limit(5);

        const duration = Date.now() - startTime;
        console.log(`⏱️  Query took ${duration}ms`);
        console.log('Status:', status, statusText);

        if (error) {
            console.error('❌ Error:', error.message);
            console.error('Details:', error);
            console.error('Hint:', error.hint);
        } else {
            console.log(`✅ Success! Found ${data?.length || 0} courses`);
            if (data && data.length > 0) {
                console.log('\nFirst course:');
                console.log('- ID:', data[0].id);
                console.log('- Title:', data[0].title);
                console.log('- Status:', data[0].status);
            }
        }

        console.log('\n📡 Testing categories query...');
        const { data: categories, error: catError } = await supabase
            .from('module_categories')
            .select('*');

        if (catError) {
            console.error('❌ Categories error:', catError.message);
        } else {
            console.log(`✅ Found ${categories?.length || 0} categories`);
        }

    } catch (error) {
        console.error('\n❌ Exception:', error.message);
        console.error('Stack:', error.stack);
    }
}

testRLS();

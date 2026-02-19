
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyFix() {
    console.log('Verifying certificate data enrichment...');

    // 1. Get a test course ID (any course)
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .limit(1);

    if (courseError || !courses || courses.length === 0) {
        console.error('❌ Could not find any courses to test with.');
        return;
    }

    const testCourse = courses[0];
    console.log(`Testing with course: "${testCourse.title}" (${testCourse.id})`);

    // 2. Perform the EXACT query used in the frontend
    console.log('Executing frontend query...');
    const { data: courseData, error: enrichError } = await supabase
        .from('courses')
        .select('title, module_categories(name)')
        .eq('id', testCourse.id)
        .single();

    if (enrichError) {
        console.error('❌ Error in enrichment query:', enrichError.message);
    } else {
        console.log('✅ Query successful!');
        console.log('Returned data:', JSON.stringify(courseData, null, 2));

        if (courseData.module_categories && courseData.module_categories.name) {
            console.log(`✅ Category Name verified: "${courseData.module_categories.name}"`);
        } else {
            console.error('❌ Category Name MISSING in response!');
            if (courseData.module_categories === null) {
                console.log('⚠️ Note: module_categories is null. This might be data-related (course has no category) rather than query-related.');
            }
        }
    }
}

verifyFix().catch(console.error);


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

async function checkTables() {
    console.log('Checking database tables...');

    // Check user_certificates table
    const { data: certificates, error: certError } = await supabase
        .from('user_certificates')
        .select('count')
        .limit(1)
        .maybeSingle();

    if (certError) {
        if (certError.code === '42P01') {
            console.error('❌ Table "user_certificates" DOES NOT EXIST.');
        } else {
            console.error('❌ Error accessing "user_certificates":', certError.message);
        }
    } else {
        console.log('✅ Table "user_certificates" exists.');
    }

    // Check courses relation to module_categories
    console.log('\nChecking "courses" -> "module_categories" relationship...');
    const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('id, title, module_categories(name)')
        .limit(1);

    if (courseError) {
        console.error('❌ Error fetching courses with module_categories:', courseError.message);
        console.log('This likely means the relationship "module_categories" is not defined or named differently.');
    } else {
        console.log('✅ Relation "module_categories" on "courses" works.');
        if (courses && courses.length > 0) {
            console.log('Sample course data:', JSON.stringify(courses[0], null, 2));
        } else {
            console.log('No courses found to test relation data.');
        }
    }

    // Check certificate_templates table
    console.log('\nChecking "certificate_templates" table...');
    const { data: templates, error: templateError } = await supabase
        .from('certificate_templates')
        .select('count')
        .limit(1)
        .maybeSingle();

    if (templateError) {
        console.error('❌ Error accessing "certificate_templates":', templateError.message);
    } else {
        console.log('✅ Table "certificate_templates" exists.');
    }
}

checkTables().catch(console.error);

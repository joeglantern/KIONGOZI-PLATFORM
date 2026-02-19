
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Fetching one course to check columns...');
    const { data: courses, error } = await supabase
        .from('courses')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error.message);
    } else if (courses && courses.length > 0) {
        console.log('Course columns:', Object.keys(courses[0]));
    } else {
        console.log('No courses found.');
    }
}

checkColumns();

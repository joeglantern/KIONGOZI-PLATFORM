import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkAllEnrollments() {
    console.log(`Checking ALL enrollments in database...`);

    const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses(title)');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} total enrollments in database:`);
    data.forEach((en: any, i) => {
        console.log(`${i + 1}. User: ${en.user_id}, Course: ${en.courses?.title || 'NULL'}, Status: ${en.status}`);
    });
}

checkAllEnrollments();

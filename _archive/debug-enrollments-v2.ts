import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const userId = '08be0480-70a5-4e3d-9c22-e4f789a90d7b';

async function checkEnrollments() {
    console.log(`Checking enrollments for user: ${userId}`);

    const { data, error } = await supabase
        .from('course_enrollments')
        .select('*, courses(*)')
        .eq('user_id', userId);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} enrollments:`);
    data.forEach((en: any) => {
        console.log(`- Course: ${en.courses?.title || 'NULL'}, Status: ${en.status}, Progress: ${en.progress_percentage}%`);
    });
}

checkEnrollments();

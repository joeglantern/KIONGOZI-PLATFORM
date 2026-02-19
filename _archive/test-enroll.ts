import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const userId = '3dfa9762-add8-4cfa-9967-fb95042ff503';
const courseId = '77d3da3c-d8db-42ef-abeb-37fe1be69818';

async function enrollUser() {
    console.log(`Enrolling user ${userId} into course ${courseId}...`);

    const { data, error } = await supabase
        .from('course_enrollments')
        .insert({
            user_id: userId,
            course_id: courseId,
            status: 'active',
            progress_percentage: 25,
            enrolled_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error('Error enrolling:', error);
    } else {
        console.log('Successfully enrolled:', data);
    }
}

enrollUser();

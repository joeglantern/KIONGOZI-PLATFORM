import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkCounts() {
    const tables = ['profiles', 'courses', 'learning_modules', 'course_enrollments', 'user_progress', 'user_badges'];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error(`Error counting ${table}:`, error);
        } else {
            console.log(`${table}: ${count} rows`);
        }
    }
}

checkCounts();

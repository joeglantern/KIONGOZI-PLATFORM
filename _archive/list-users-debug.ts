import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function listUsers() {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name');

    for (const profile of profiles || []) {
        const { count } = await supabase
            .from('course_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

        console.log(`User: ${profile.full_name} (${profile.id}) - Enrollments: ${count}`);
    }
}

listUsers();


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = createClient(supabaseUrl, serviceKey);

async function checkTotalCounts() {
    console.log('📊 Total Database Counts\n');

    const { count: profileCount, error: pErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
    console.log(`👤 Total Profiles: ${pErr ? 'Error' : profileCount}`);

    const { count: courseCount, error: cErr } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true });
    console.log(`📖 Total Courses: ${cErr ? 'Error' : courseCount}`);

    const { count: categoryCount, error: catErr } = await supabase
        .from('module_categories')
        .select('*', { count: 'exact', head: true });
    console.log(`📚 Total Categories: ${catErr ? 'Error' : categoryCount}`);

    if (courseCount && courseCount > 0) {
        console.log('\n📋 Course Titles:');
        const { data: courseTitles } = await supabase.from('courses').select('title');
        courseTitles?.forEach((c, i) => console.log(`${i + 1}. ${c.title}`));
    }
}

checkTotalCounts().catch(console.error);


import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('❌ Supabase configuration missing (URL or Service Key)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkDatabase() {
    console.log('🔍 Database Access Check\n');

    // 1. Check Profiles
    console.log('--- Profiles ---');
    const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (pErr) console.error('❌ Error fetching profiles:', pErr.message);
    else console.log(`✅ Found ${profiles?.length || 0} profiles. Samples:`, JSON.stringify(profiles, null, 2));

    // 2. Check Courses
    console.log('\n--- Courses ---');
    const { data: courses, error: cErr } = await supabase
        .from('courses')
        .select('id, title, status')
        .limit(5);

    if (cErr) console.error('❌ Error fetching courses:', cErr.message);
    else console.log(`✅ Found ${courses?.length || 0} courses. Samples:`, JSON.stringify(courses, null, 2));

    // 3. Check Module Categories
    console.log('\n--- Module Categories ---');
    const { data: categories, error: catErr } = await supabase
        .from('module_categories')
        .select('id, name')
        .limit(5);

    if (catErr) console.error('❌ Error fetching categories:', catErr.message);
    else console.log(`✅ Found ${categories?.length || 0} categories. Samples:`, JSON.stringify(categories, null, 2));

    console.log('\n🏁 Diagnostic complete.');
}

checkDatabase().catch(console.error);

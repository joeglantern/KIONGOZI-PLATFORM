
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTables() {
    console.log("Checking for social_posts table...");
    const { data, error } = await supabase
        .from('social_posts')
        .select('count', { count: 'exact', head: true });

    if (error) {
        console.error("Error checking table:", error);
    } else {
        console.log("Table exists! Row count:", data);
    }
}

checkTables();

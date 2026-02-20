
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
    console.log("Checking profiles...");
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(5);

    if (error) {
        console.error("Error checking profiles:", error);
    } else {
        console.log("Profiles found:", profiles.length);
        console.log(profiles);
    }
}

checkProfiles();


require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLikesTable() {
    console.log("Checking social_likes table...");
    const { data, error } = await supabase
        .from('social_likes')
        .select('count', { count: 'exact', head: true });

    if (error) {
        console.error("Error checking social_likes:", error);
    } else {
        console.log("social_likes table exists.");
    }

    console.log("Checking social_posts table columns...");
    // We can't easily check columns with JS client without inspection, but we can try to select likes_count
    const { data: posts, error: postsError } = await supabase
        .from('social_posts')
        .select('likes_count')
        .limit(1);

    if (postsError) {
        console.error("Error checking social_posts columns:", postsError);
    } else {
        console.log("social_posts.likes_count accessed successfully.");
    }
}

checkLikesTable();

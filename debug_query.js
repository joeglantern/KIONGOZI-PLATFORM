
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testQuery() {
  console.log("Testing query...");
  const { data, error } = await supabase
    .from('social_posts')
    .select(`
      *,
      profiles:user_id (
        full_name
      ),
      social_topics (
        name,
        slug
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Query failed:", JSON.stringify(error, null, 2));
  } else {
    console.log("Query success! Rows:", data?.length);
  }
}

testQuery();

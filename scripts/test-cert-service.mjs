import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdncfyagppohtksogzkx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
    const code = '7udrau4vo7nggrv12si0j';
    const { data, error } = await supabase
        .from("user_certificates")
        .select(`*`)
        .eq("verification_code", code);

    console.log("Error selecting just cert:", error ? error.message : "None");

    if (!error) {
        const { error: error2 } = await supabase
            .from("user_certificates")
            .select(`
              *,
              profiles:user_id (full_name, avatar_url),
              courses:course_id (title, description, thumbnail_url)
            `)
            .eq("verification_code", code);
        console.log("Error with joins:", error2 ? error2.message : "None");
    }
}
main();

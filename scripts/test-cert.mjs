import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jdncfyagppohtksogzkx.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
    const { data: cert } = await supabase
        .from("user_certificates")
        .select('*')
        .limit(1);

    if (cert && cert.length > 0) {
        Object.keys(cert[0]).forEach(k => console.log('COL: ' + k));
    }
}

main().catch(console.error);

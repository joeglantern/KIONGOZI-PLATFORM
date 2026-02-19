const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugProfiles() {
    console.log('🔍 Fetching all profiles...\n');
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, first_name, last_name, total_xp, level')
        .order('total_xp', { ascending: false });

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    data.forEach(p => {
        const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'EMPTY';
        console.log(`[${p.id.substring(0, 8)}] XP: ${p.total_xp} | Lvl: ${p.level} | Name: ${name} | Email: ${p.email}`);
    });
}

debugProfiles();

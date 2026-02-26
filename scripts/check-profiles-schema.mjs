import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    'https://jdncfyagppohtksogzkx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY'
);

const cols = ['current_streak', 'max_streak', 'longest_streak', 'last_activity_date', 'last_action_date', 'total_xp', 'level'];

for (const col of cols) {
    const { error } = await supabase.from('profiles').select(col).limit(1);
    console.log(`${col}: ${error ? 'MISSING - ' + error.message : 'EXISTS'}`);
}

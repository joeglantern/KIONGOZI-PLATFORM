const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testRPC() {
    console.log('🧪 Testing get_leaderboard_with_context RPC...\n');

    // First get a user with XP
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, total_xp')
        .gt('total_xp', 0)
        .limit(1);

    if (!profiles || profiles.length === 0) {
        console.log('⚠️ No users with XP found to test with.');
        return;
    }

    const testUserId = profiles[0].id;
    console.log(`👤 Testing with User ID: ${testUserId} (${profiles[0].full_name}, XP: ${profiles[0].total_xp})`);

    const { data, error } = await supabase.rpc('get_leaderboard_with_context', {
        p_user_id: testUserId,
        top_count: 5,
        context_count: 3
    });

    if (error) {
        console.error('❌ RPC Error Found:');
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log('✅ RPC Success!');
        console.table(data);
    }
}

testRPC();

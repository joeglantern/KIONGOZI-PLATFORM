import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://jdncfyagppohtksogzkx.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbmNmeWFncHBvaHRrc29nemt4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDY4ODc3OCwiZXhwIjoyMDcwMjY0Nzc4fQ.phxQZrQylHDae8rBqDzcyrFda0BTtj6rI_KwKrejnpY';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseLeaderboard() {
    console.log('🔍 Diagnosing Leaderboard Coverage...\n');

    // 1. Total Profiles
    const { count: totalProfiles } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    // 2. Profiles with XP > 0
    const { count: totalWithXP } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gt('total_xp', 0);

    // 3. Profiles with at least one enrollment
    const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('user_id');

    const uniqueEnrolledUsers = new Set(enrollments?.map(e => e.user_id));
    const totalEnrolled = uniqueEnrolledUsers.size;

    // 4. Test the RPC call for a sample user
    const { data: sampleProfile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single();

    let rpcCount = 0;
    if (sampleProfile) {
        const { data: leaderboardData, error: rpcError } = await supabase
            .rpc('get_leaderboard_with_context', {
                p_user_id: sampleProfile.id,
                top_count: 1000, // Large count to see everyone
                context_count: 0
            });

        if (rpcError) {
            console.error('❌ RPC Error:', rpcError.message);
        } else {
            rpcCount = leaderboardData?.length || 0;
        }
    }

    console.log('📊 Statistics:');
    console.log('─'.repeat(50));
    console.log(`Total Profiles in DB:       ${totalProfiles ?? 0}`);
    console.log(`Profiles with XP > 0:       ${totalWithXP ?? 0}`);
    console.log(`Unique Enrolled Learners:   ${totalEnrolled ?? 0}`);
    console.log(`Leaderboard RPC Returns:    ${rpcCount}`);
    console.log('─'.repeat(50));

    if (rpcCount < (totalEnrolled ?? 0)) {
        console.log('\n⚠️  DISCREPANCY DETECTED: The leaderboard is missing some enrolled learners.');
    } else if (rpcCount < (totalProfiles ?? 0)) {
        console.log('\nℹ️  The leaderboard shows active learners but not all profiles.');
    } else {
        console.log('\n✅ The leaderboard seems to cover everyone.');
    }
}

diagnoseLeaderboard();

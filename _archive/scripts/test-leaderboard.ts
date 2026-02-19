import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, serviceKey);

/**
 * Simulates what the new leaderboard.ts buildLeaderboard() does
 */
async function testLeaderboard() {
    console.log('=== Testing New Leaderboard Logic ===\n');

    // 1. Fetch profiles
    const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, total_xp, level')
        .order('total_xp', { ascending: false, nullsFirst: false });

    if (profilesErr) {
        console.error('FAIL: Could not fetch profiles:', profilesErr.message);
        process.exit(1);
    }

    console.log(`Profiles fetched: ${profiles?.length || 0}`);

    // 2. Fetch stats
    const [enrollmentsRes, progressRes, badgesRes] = await Promise.all([
        supabase.from('course_enrollments').select('user_id, completed_at'),
        supabase.from('user_progress').select('user_id, status'),
        supabase.from('user_badges').select('user_id'),
    ]);

    if (enrollmentsRes.error) console.error('WARN: course_enrollments:', enrollmentsRes.error.message);
    if (progressRes.error) console.error('WARN: user_progress:', progressRes.error.message);
    if (badgesRes.error) console.error('WARN: user_badges:', badgesRes.error.message);

    console.log(`Enrollments: ${enrollmentsRes.data?.length || 0}`);
    console.log(`Progress records: ${progressRes.data?.length || 0}`);
    console.log(`Badge assignments: ${badgesRes.data?.length || 0}`);

    // 3. Build stats maps
    const coursesMap = new Map<string, number>();
    for (const e of (enrollmentsRes.data || [])) {
        if (e.completed_at) coursesMap.set(e.user_id, (coursesMap.get(e.user_id) || 0) + 1);
    }

    const modulesMap = new Map<string, number>();
    for (const p of (progressRes.data || [])) {
        if (p.status === 'completed') modulesMap.set(p.user_id, (modulesMap.get(p.user_id) || 0) + 1);
    }

    const badgesMap = new Map<string, number>();
    for (const b of (badgesRes.data || [])) {
        badgesMap.set(b.user_id, (badgesMap.get(b.user_id) || 0) + 1);
    }

    // 4. Build leaderboard
    console.log('\n--- LEADERBOARD (Top 10) ---');
    const entries = (profiles || []).map((profile, index) => {
        const xp = profile.total_xp ?? 0;
        return {
            rank: index + 1,
            name: profile.full_name || profile.email?.split('@')[0] || '?',
            xp,
            level: Math.max(1, Math.floor(Math.sqrt(Math.max(xp, 0) / 50))),
            courses: coursesMap.get(profile.id) || 0,
            modules: modulesMap.get(profile.id) || 0,
            badges: badgesMap.get(profile.id) || 0,
        };
    });

    for (const e of entries.slice(0, 10)) {
        console.log(`  #${e.rank} ${e.name} — ${e.xp} XP, Lvl ${e.level}, ${e.modules} modules, ${e.badges} badges`);
    }

    console.log(`\nTotal learners: ${entries.length}`);
    console.log('\n=== SUCCESS ===');
}

testLeaderboard().catch(console.error);

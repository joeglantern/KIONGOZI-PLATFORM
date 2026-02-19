import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const supabase = createClient(supabaseUrl, serviceKey);

const lines: string[] = [];
function log(msg: string) { lines.push(msg); }

async function inspectSchema() {
    log('=== DATABASE SCHEMA ===');

    const knownTables = [
        'profiles', 'courses', 'modules', 'lessons', 'quizzes', 'quiz_questions',
        'course_enrollments', 'user_progress', 'user_badges', 'badges',
        'categories', 'quiz_attempts', 'quiz_answers', 'certificates',
        'user_streaks', 'xp_transactions', 'notifications', 'course_categories',
        'lesson_content', 'user_achievements', 'achievements'
    ];

    log('\n--- TABLES ---');
    for (const table of knownTables) {
        const { error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (!error) {
            // Get column names from a sample row
            const { data: sample } = await supabase.from(table).select('*').limit(1);
            const cols = sample && sample.length > 0 ? Object.keys(sample[0]) : [];
            log(`\nTABLE: ${table} (${count} rows)`);
            log(`  Columns: ${cols.join(', ')}`);
        }
    }

    // Test RPCs
    log('\n\n--- RPC FUNCTIONS ---');
    const rpcs = ['get_top_learners', 'get_leaderboard_with_context', 'get_user_rank', 'refresh_leaderboard'];
    for (const rpc of rpcs) {
        try {
            const params = rpc === 'get_top_learners' ? { limit_count: 2 } :
                rpc === 'get_leaderboard_with_context' ? { p_user_id: '00000000-0000-0000-0000-000000000000', top_count: 2, context_count: 1 } :
                    rpc === 'get_user_rank' ? { p_user_id: '00000000-0000-0000-0000-000000000000' } : {};
            const { data, error } = await supabase.rpc(rpc, params);
            log(`RPC ${rpc}: ${error ? 'FAIL - ' + error.message : 'OK (' + (Array.isArray(data) ? data.length + ' rows' : typeof data) + ')'}`);
            if (!error && Array.isArray(data) && data.length > 0) {
                log(`  Return cols: ${Object.keys(data[0]).join(', ')}`);
            }
        } catch (e: unknown) {
            log(`RPC ${rpc}: ERROR - ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    // Profiles detail - key table for leaderboard
    log('\n\n--- PROFILES SAMPLE ---');
    const { data: profiles } = await supabase.from('profiles').select('*').limit(5);
    if (profiles) {
        for (const p of profiles) {
            log(JSON.stringify(p));
        }
    }

    // user_progress detail
    log('\n\n--- USER_PROGRESS SAMPLE ---');
    const { data: up, error: upErr } = await supabase.from('user_progress').select('*').limit(5);
    if (upErr) log(`Error: ${upErr.message}`);
    else if (up) { for (const u of up) log(JSON.stringify(u)); }
    else log('(empty)');

    // course_enrollments detail
    log('\n\n--- COURSE_ENROLLMENTS SAMPLE ---');
    const { data: ce, error: ceErr } = await supabase.from('course_enrollments').select('*').limit(5);
    if (ceErr) log(`Error: ${ceErr.message}`);
    else if (ce) { for (const c of ce) log(JSON.stringify(c)); }
    else log('(empty)');

    // user_badges detail
    log('\n\n--- USER_BADGES SAMPLE ---');
    const { data: ub, error: ubErr } = await supabase.from('user_badges').select('*').limit(5);
    if (ubErr) log(`Error: ${ubErr.message}`);
    else if (ub) { for (const b of ub) log(JSON.stringify(b)); }
    else log('(empty)');

    // xp_transactions
    log('\n\n--- XP_TRANSACTIONS SAMPLE ---');
    const { data: xp, error: xpErr } = await supabase.from('xp_transactions').select('*').limit(5);
    if (xpErr) log(`Error: ${xpErr.message}`);
    else if (xp) { for (const x of xp) log(JSON.stringify(x)); }
    else log('(empty)');

    // quiz_attempts
    log('\n\n--- QUIZ_ATTEMPTS SAMPLE ---');
    const { data: qa, error: qaErr } = await supabase.from('quiz_attempts').select('*').limit(5);
    if (qaErr) log(`Error: ${qaErr.message}`);
    else if (qa) { for (const q of qa) log(JSON.stringify(q)); }
    else log('(empty)');

    // Write output
    fs.writeFileSync(path.resolve(process.cwd(), 'scripts/schema-output.txt'), lines.join('\n'), 'utf8');
    console.log('Done! Output written to scripts/schema-output.txt');
}

inspectSchema().catch(console.error);

import { serviceClient as supabase } from './_supabase.mjs';

const cols = ['current_streak', 'max_streak', 'longest_streak', 'last_activity_date', 'last_action_date', 'total_xp', 'level'];

for (const col of cols) {
    const { error } = await supabase.from('profiles').select(col).limit(1);
    console.log(`${col}: ${error ? 'MISSING - ' + error.message : 'EXISTS'}`);
}

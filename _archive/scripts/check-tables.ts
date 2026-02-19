import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function checkTables() {
    console.log('Probing tables directly...\n');

    // Check learning_modules
    const { data: modules, error: modErr } = await supabase.from('learning_modules').select('*').limit(1);
    if (modErr) {
        console.log('learning_modules table error:', modErr.message);
        // Try 'modules'
        const { data: mods, error: mErr } = await supabase.from('modules').select('*').limit(1);
        if (mErr) console.log('modules table error:', mErr.message);
        else {
            console.log('Found table: modules');
            if (mods && mods.length > 0) console.log('Sample keys:', Object.keys(mods[0]));
        }
    } else {
        console.log('Found table: learning_modules');
        if (modules && modules.length > 0) console.log('Sample keys:', Object.keys(modules[0]));
    }

    // Check discussion_threads
    const { error: discErr } = await supabase.from('discussion_threads').select('*').limit(1);
    if (discErr) {
        console.log('discussion_threads error:', discErr.message);
        // Try 'discussions'
        const { error: dErr } = await supabase.from('discussions').select('*').limit(1);
        if (dErr) console.log('discussions error:', dErr.message);
        else console.log('Found table: discussions');
    }
    else console.log('Found table: discussion_threads');

    // Check chat_messages
    const { error: chatErr } = await supabase.from('chat_messages').select('*').limit(1);
    if (chatErr) console.log('chat_messages error:', chatErr.message);
    else console.log('Found table: chat_messages');
}

checkTables().catch(console.error);

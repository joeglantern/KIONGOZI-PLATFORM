import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function inspect() {
    console.log('--- Inspecting Chat Schema & Relationships ---\n');

    // 1. Check chat_rooms
    console.log('Checking "chat_rooms"...');
    const { error: roomErr } = await supabase.from('chat_rooms').select('id').limit(1);
    if (roomErr) console.error('FAILED:', roomErr.message, roomErr.details);
    else console.log('SUCCESS: Table exists.');

    // 2. Check chat_participants
    console.log('\nChecking "chat_participants"...');
    const { error: partErr } = await supabase.from('chat_participants').select('room_id').limit(1);
    if (partErr) console.error('FAILED:', partErr.message, partErr.details);
    else console.log('SUCCESS: Table exists.');

    // 3. Test Room -> Participants Relationship
    console.log('\nTesting Join: chat_rooms -> chat_participants...');
    const { error: join1Err } = await supabase
        .from('chat_rooms')
        .select('id, chat_participants(*)')
        .limit(1);

    if (join1Err) {
        console.error('FAILED:', join1Err.message);
        console.log('Hint: Foreign key might be missing or named differently.');
    } else {
        console.log('SUCCESS: Relationship works.');
    }

    // 4. Test Participant -> Profile Relationship
    console.log('\nTesting Join: chat_participants -> profiles...');
    const { error: join2Err } = await supabase
        .from('chat_participants')
        .select('user_id, profiles(*)')
        .limit(1);

    if (join2Err) {
        console.error('FAILED:', join2Err.message);
    } else {
        console.log('SUCCESS: Relationship works.');
    }

    // 5. Check constraints/FKs using RPC if standard queries fail
    // We'll try to query pg_catalog tables via RPC if possible, or just information_schema
    // But usually direct join tests (above) are the best indicator for PostgREST
}

inspect().catch(console.error);

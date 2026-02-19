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

async function checkSchema() {
    console.log('--- CHECKING SCHEMA FOR INSTRUCTOR FEATURES ---\n');

    // 1. Check for Chat/Message tables
    console.log('Checking for Chat/Message tables...');
    const { data: tables, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');

    if (tableError) console.error('Error fetching tables:', tableError);

    const allTables = tables?.map(t => t.table_name) || [];
    const chatTables = allTables.filter(t => t.includes('chat') || t.includes('messag') || t.includes('conversation'));

    if (chatTables.length > 0) {
        console.log('Found potential chat tables:', chatTables);
        for (const t of chatTables) {
            const { data: cols } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type')
                .eq('table_schema', 'public')
                .eq('table_name', t);
            console.log(`Columns for ${t}:`);
            console.table(cols);
        }
    } else {
        console.log('NO chat/message tables found.');
    }

    // 2. Check Learning Modules for media support
    console.log('\nChecking Learning Modules columns (for media)...');
    if (allTables.includes('learning_modules')) {
        const { data: moduleCols } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_schema', 'public')
            .eq('table_name', 'learning_modules');
        console.table(moduleCols);
    } else if (allTables.includes('modules')) {
        const { data: moduleCols } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_schema', 'public')
            .eq('table_name', 'modules');
        console.table(moduleCols);
    } else {
        console.log('Could not find learning_modules or modules table.');
    }

    // 3. Check Discussion tables
    console.log('\nChecking Discussion tables...');
    const discussionTables = allTables.filter(t => t.includes('discussion'));
    console.log('Discussion tables:', discussionTables);

    for (const t of discussionTables) {
        const { data: cols } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_schema', 'public')
            .eq('table_name', t);
        console.log(`Columns for ${t}:`);
        console.table(cols);
    }
}

checkSchema().catch(console.error);


const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- Supabase Diagnosis ---');
console.log('URL:', url || 'MISSING');
console.log('Key:', key ? 'PRESENT (starts with ' + key.substring(0, 10) + '...)' : 'MISSING');

if (!url || !key) {
    console.error('❌ Configuration missing in .env.local');
    process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
    console.log('\n📡 Testing connection...');
    try {
        const start = Date.now();
        const { data, error } = await supabase.from('courses').select('id').limit(1);
        const duration = Date.now() - start;

        if (error) {
            console.error('❌ Request failed:', error.message);
            console.error('Error Code:', error.code);
            console.error('Status:', error.status);
        } else {
            console.log('✅ Success! Request took', duration, 'ms');
            console.log('Data:', data);
        }
    } catch (err) {
        console.error('❌ Unexpected fetch error:', err.message);
        if (err.cause) console.error('Cause:', err.cause);
    }
}

check();

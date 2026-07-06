import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first (Next.js convention), then .env as a fallback.
config({ path: '.env.local' });
config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error(
        'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
        'Set them in .env.local (never commit the service-role key) before running scripts.'
    );
    process.exit(1);
}

export { SUPABASE_URL, SERVICE_ROLE_KEY };

// Service-role client for local maintenance scripts. Never ship this to the browser.
export const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

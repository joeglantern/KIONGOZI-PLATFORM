
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const projectRef = supabaseUrl ? supabaseUrl.replace('https://', '').replace('.supabase.co', '') : '';

if (!supabaseUrl || !serviceKey) {
    console.error('Missing Supabase URL or Service Key in .env.local');
    process.exit(1);
}

const FILES_TO_RUN = [
    'fix-profiles-rls.sql',
    'fix-courses-rls.sql',
    'fix-chat-rls.sql',
    'alter-modules.sql',
    'alter-chat-course.sql'
];

async function runFile(filename: string) {
    const sqlFile = path.resolve(process.cwd(), 'scripts', filename);
    if (!fs.existsSync(sqlFile)) {
        console.error(`File not found: ${sqlFile}`);
        return false;
    }

    const sql = fs.readFileSync(sqlFile, 'utf8');
    console.log(`\n=== Executing ${filename} ===`);

    // Use internal Supabase API endpoints - most reliable way to run raw SQL without pg driver
    const attempts = [
        {
            url: `https://${projectRef}.supabase.co/pg/query`,
            body: { query: sql },
        },
        {
            url: `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
            body: { query: sql },
        }
    ];

    for (const attempt of attempts) {
        try {
            // console.log(`Trying: ${attempt.url}`);
            const res = await fetch(attempt.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    // 'x-connection-encrypted': 'true' // Sometimes needed?
                },
                body: JSON.stringify(attempt.body),
            });

            if (res.ok) {
                console.log(`  ✅ Success`);
                return true;
            } else {
                // warning but continue to next attempt
            }
        } catch (e) {
            // ignore
        }
    }

    // Fallback: splitting statements and running via RPC exec_sql if it exists
    // (Omitted for brevity, assuming Project API works or user will use dashboard)
    console.error(`  ❌ Failed to execute ${filename} via API. Please run manually in Supabase Dashboard.`);
    return false;
}

async function main() {
    console.log(`Target Project: ${projectRef}`);

    let successCount = 0;

    for (const file of FILES_TO_RUN) {
        const ok = await runFile(file);
        if (ok) successCount++;
    }

    console.log(`\nSummary: ${successCount}/${FILES_TO_RUN.length} scripts executed successfully.`);
}

main().catch(console.error);

/**
 * Execute fix-leaderboard-rpcs.sql against Supabase
 * Uses the Supabase Management API v1 SQL query endpoint
 * which accepts the service_role key for authentication.
 */
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');

// Split SQL into individual executable blocks
// Each block is one DROP/CREATE/GRANT statement (handling $$ delimiters)
function splitSQL(sql: string): string[] {
    const blocks: string[] = [];
    let current = '';
    let inDollarBlock = false;

    for (const line of sql.split('\n')) {
        const trimmed = line.trim();

        // Skip pure comment lines and empty lines when not in a block
        if (!inDollarBlock && (trimmed.startsWith('--') || trimmed === '')) {
            if (current.trim()) current += '\n' + line;
            continue;
        }

        current += (current ? '\n' : '') + line;

        // Track $$ blocks (function bodies)
        const dollarMatches = line.match(/\$\$/g);
        if (dollarMatches) {
            for (const _m of dollarMatches) {
                inDollarBlock = !inDollarBlock;
            }
        }

        // If we're outside a $$ block and line ends with ;, it's end of statement
        if (!inDollarBlock && trimmed.endsWith(';')) {
            const stmt = current.trim();
            if (stmt && !stmt.startsWith('--')) {
                blocks.push(stmt);
            }
            current = '';
        }
    }

    return blocks;
}

async function executeSQL(sql: string, label: string): Promise<boolean> {
    // Use the PostgREST-compatible endpoint for raw SQL via service role
    // The correct endpoint is the database's REST endpoint with raw SQL
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: sql }),
    });

    if (res.ok) {
        console.log(`  OK: ${label}`);
        return true;
    }

    // If exec_sql doesn't exist, we need to create it first
    const text = await res.text();
    if (text.includes('exec_sql')) {
        return false; // Signal that exec_sql needs to be created
    }

    console.error(`  FAIL: ${label} - ${res.status}: ${text.substring(0, 200)}`);
    return false;
}

async function createExecSqlFunction(): Promise<boolean> {
    // Try to create a helper function that can execute arbitrary SQL
    // We'll use a raw SQL endpoint that some Supabase versions expose

    // The Supabase GraphQL endpoint can sometimes execute through the schema
    // But the most reliable way is through their internal API

    // Try the undocumented /query endpoint first
    const endpoints = [
        `${supabaseUrl}/rest/v1/rpc/`,  // RPC base
    ];

    // Actually, let's try a different approach: use the pg_net extension
    // or just create the function via a creative workaround

    // The REAL solution: Supabase projects have an internal API at
    // https://api.supabase.com/v1/projects/{ref}/database/query
    // But that needs a personal access token

    // Instead, let's use a pure TypeScript workaround:
    // Create a DO block that creates the exec_sql function
    const createFnSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(query text)
    RETURNS json
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $fn$
    BEGIN
      EXECUTE query;
      RETURN '{"status":"ok"}'::json;
    END;
    $fn$;
    GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated, anon, service_role;
  `;

    // We can't create this function without already having SQL execution...
    // This is circular. Let's try a completely different approach.
    return false;
}

async function runViaSupabaseDashboardAPI() {
    // The Supabase SQL Editor uses an internal API. Let's try it.
    // It's at https://<project-ref>.supabase.co/pg/query
    // or the newer endpoint

    const sqlFile = path.resolve(process.cwd(), 'fix-leaderboard-rpcs.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('=== Executing fix-leaderboard-rpcs.sql ===\n');

    // Try multiple possible SQL execution endpoints
    const attempts = [
        {
            url: `https://${projectRef}.supabase.co/pg`,
            body: { query: sql },
        },
        {
            url: `https://${projectRef}.supabase.co/pg/query`,
            body: { query: sql },
        },
        {
            url: `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
            body: { query: sql },
        },
    ];

    for (const attempt of attempts) {
        try {
            console.log(`Trying: ${attempt.url}`);
            const res = await fetch(attempt.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                },
                body: JSON.stringify(attempt.body),
            });

            console.log(`  Status: ${res.status}`);

            if (res.ok) {
                const data = await res.json();
                console.log(`  SUCCESS!`);
                console.log(`  Result: ${JSON.stringify(data).substring(0, 500)}`);
                return true;
            }

            const text = await res.text();
            console.log(`  Response: ${text.substring(0, 300)}`);
        } catch (e) {
            console.log(`  Error: ${e}`);
        }
        console.log();
    }

    // Last resort: try splitting and executing statement by statement
    console.log('\n--- Trying statement-by-statement via exec_sql RPC ---');
    const statements = splitSQL(sql);
    console.log(`Found ${statements.length} SQL statements\n`);

    // First check if exec_sql function exists
    const testRes = await executeSQL('SELECT 1', 'test');
    if (!testRes) {
        console.log('\nexec_sql function does not exist in database.');
        console.log('\nPlease run the SQL manually:');
        console.log(`  https://supabase.com/dashboard/project/${projectRef}/sql/new`);
        console.log(`\nOr paste the contents of fix-leaderboard-rpcs.sql into the SQL editor.`);
        return false;
    }

    // Execute each statement
    let success = 0;
    let failed = 0;
    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        const label = stmt.split('\n')[0].substring(0, 60);
        const ok = await executeSQL(stmt, label);
        if (ok) success++;
        else failed++;
    }

    console.log(`\nResults: ${success} succeeded, ${failed} failed`);
    return failed === 0;
}

runViaSupabaseDashboardAPI().catch(console.error);

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { writeFileSync } from 'fs';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

async function rpc(sql) {
  const res = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function pgMeta(endpoint) {
  const res = await fetch(`${url}/pg/${endpoint}`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  return res.ok ? res.json() : { error: `${res.status} ${await res.text()}` };
}

// Best-effort: try listing each likely course-related table and report row counts + a sample row
const candidates = [
  'courses',
  'learning_modules',
  'course_modules',
  'course_enrollments',
  'user_progress',
  'module_categories',
  'profiles',
];

const report = { tables: {} };

for (const t of candidates) {
  try {
    const { count, error: cerr } = await supabase
      .from(t)
      .select('*', { count: 'exact', head: true });
    if (cerr) {
      report.tables[t] = { exists: false, error: cerr.message };
      continue;
    }
    const { data: sample } = await supabase.from(t).select('*').limit(1);
    const columns = sample && sample[0] ? Object.keys(sample[0]) : [];
    report.tables[t] = { exists: true, row_count: count, columns, sample: sample?.[0] || null };
  } catch (e) {
    report.tables[t] = { exists: false, error: String(e) };
  }
}

// Also: list all tables visible via information_schema using a select on a view
// Some Supabase projects expose pg_tables via the REST API only if a view is created.
// We'll attempt to query a generic listing.
try {
  const { data, error } = await supabase
    .from('pg_tables')
    .select('schemaname, tablename')
    .eq('schemaname', 'public');
  if (!error) report.public_tables = data;
  else report.public_tables_error = error.message;
} catch (e) {
  report.public_tables_error = String(e);
}

writeFileSync('scripts/schema-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

#!/usr/bin/env node
/**
 * generate-db-map.mjs
 * Refreshes DATABASE_MAP.md from the live Supabase schema.
 *
 * Usage:
 *   export SUPABASE_ACCESS_TOKEN=<your-personal-access-token>
 *   node scripts/generate-db-map.mjs
 *
 * Get a PAT at: https://supabase.com/dashboard/account/tokens
 * In CI: set SUPABASE_ACCESS_TOKEN as a GitHub Actions secret.
 *
 * No npm dependencies, uses Node 18+ built-in fetch.
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
if (!ACCESS_TOKEN) {
  console.error('Error: SUPABASE_ACCESS_TOKEN env var is required.')
  console.error('Get one at https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

const config = JSON.parse(readFileSync(join(__dirname, 'db-map-config.json'), 'utf8'))
const SHARED_ID  = config.projects.shared.id
const LANDING_ID = config.projects.landing.id

// ── Supabase Management API helper ──────────────────────────────────────────

async function sql(projectId, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectId}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`SQL failed on ${projectId}: ${JSON.stringify(body)}`)
  }
  return body
}

// ── Schema introspection queries ─────────────────────────────────────────────

const TABLE_QUERY = `
SELECT
  t.table_name,
  CASE WHEN pc.relrowsecurity THEN 'enabled' ELSE 'disabled' END AS rls,
  COUNT(DISTINCT c.column_name)::int AS col_count,
  COUNT(DISTINCT fk.constraint_name)::int AS fk_count
FROM information_schema.tables t
JOIN pg_class pc
  ON pc.relname = t.table_name
  AND pc.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
LEFT JOIN information_schema.columns c
  ON c.table_name = t.table_name AND c.table_schema = 'public'
LEFT JOIN information_schema.table_constraints fk
  ON fk.table_name = t.table_name AND fk.table_schema = 'public' AND fk.constraint_type = 'FOREIGN KEY'
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name, pc.relrowsecurity
ORDER BY t.table_name;`

const FK_QUERY = `
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;`

// ── Markdown generation ───────────────────────────────────────────────────────

function rlsBadge(status) {
  return status === 'enabled' ? '✓' : '**✗ DISABLED**'
}

function fkSummary(tableName, fkRows) {
  const rows = fkRows.filter(r => r.table_name === tableName)
  if (!rows.length) return ', '
  return rows.map(r => `${r.column_name} → ${r.foreign_table} (${r.delete_rule.replace('NO ACTION','NO ACT')})`).join(', ')
}

function appList(tableName) {
  const apps = config.ownership[tableName]
  if (!apps || !apps.length) return '*(orphaned)*'
  return apps.join(', ')
}

function tableRows(tables, fkRows, domainTables) {
  const rows = domainTables
    .map(name => tables.find(t => t.table_name === name))
    .filter(Boolean)
  return rows.map(t =>
    `| \`${t.table_name}\` | ${t.col_count} | ${rlsBadge(t.rls)} | ${fkSummary(t.table_name, fkRows)} | ${appList(t.table_name)} |`
  ).join('\n')
}

function domainSection(domainKey, tables, fkRows) {
  const d = config.domains[domainKey]
  const count = d.tables.filter(name => tables.find(t => t.table_name === name)).length
  return `### ${domainKey} (${count} tables)\n\n${d.description}\n\n| Table | Cols | RLS | Key FKs (ON DELETE) | Apps |\n|---|---|---|---|---|\n${tableRows(tables, fkRows, d.tables)}`
}

// ── Ownership matrix ──────────────────────────────────────────────────────────

function ownershipMatrix(tables) {
  const apps = Object.keys(config.apps).filter(a => a !== 'landing')
  const header = `| Domain | Tables (n) | ${apps.join(' | ')} |`
  const sep    = `|---|---|${apps.map(() => '---').join('|')}|`
  const rows = Object.entries(config.domains).map(([key, d]) => {
    const count = d.tables.filter(name => tables.find(t => t.table_name === name)).length
    const appsInDomain = new Set(d.tables.flatMap(name => config.ownership[name] ?? []))
    const cells = apps.map(a => appsInDomain.has(a) ? '✓' : '').join(' | ')
    return `| **${key}** | ${count} | ${cells} |`
  })
  return [header, sep, ...rows].join('\n')
}

// ── Landing DB section ────────────────────────────────────────────────────────

function landingSection(ltables) {
  const rows = ltables.map(t =>
    `| \`${t.table_name}\` | ${t.col_count} | ${rlsBadge(t.rls)} | |`
  ).join('\n')
  return `| Table | Cols | RLS | Notes |\n|---|---|---|---|\n${rows}`
}

// ── Orphan table listing ──────────────────────────────────────────────────────

function orphanSection(tables) {
  return config.orphaned
    .filter(name => tables.find(t => t.table_name === name))
    .map(name => `| \`${name}\` | *(see db-map-config.json for reason)* |`)
    .join('\n')
}

// ── New (unmapped) tables ─────────────────────────────────────────────────────

function newTablesSection(tables) {
  const known = new Set([
    ...Object.keys(config.ownership),
    ...config.orphaned,
  ])
  const unknown = tables.filter(t => !known.has(t.table_name))
  if (!unknown.length) return ''
  return `\n## ⚠️ New tables (unmapped)\n\nThese tables appeared in the live schema but are not yet in \`db-map-config.json\`. Add them to the ownership map.\n\n| Table | Cols | RLS |\n|---|---|---|\n${unknown.map(t => `| \`${t.table_name}\` | ${t.col_count} | ${rlsBadge(t.rls)} |`).join('\n')}\n`
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Querying shared DB…')
  const [sharedTables, sharedFKs] = await Promise.all([
    sql(SHARED_ID, TABLE_QUERY),
    sql(SHARED_ID, FK_QUERY),
  ])

  console.log('Querying landing DB…')
  const landingTables = await sql(LANDING_ID, TABLE_QUERY)

  const now = new Date().toISOString().slice(0, 10)
  const sharedCount = sharedTables.length
  const landingCount = landingTables.length

  const appKeys = Object.keys(config.apps).filter(a => a !== 'landing')

  const md = `# Kiongozi Platform, Database Map

<!-- AUTO-GENERATED by scripts/generate-db-map.mjs, do not edit schema sections by hand -->
<!-- Last updated: ${now} | Shared DB tables: ${sharedCount} | Landing DB tables: ${landingCount} -->
<!-- To refresh: node scripts/generate-db-map.mjs  (requires SUPABASE_ACCESS_TOKEN) -->
<!-- CI: .github/workflows/update-db-map.yml fires on every merged migration -->

---

## 1. System overview

Two Supabase projects, eight consumer apps. **Never drop a shared-DB table based on one app alone.**

| Database | Project ID | Tables | Consumer apps |
|---|---|---|---|
| Shared ("${config.projects.shared.name}") | \`${SHARED_ID}\` | ${sharedCount} | ${appKeys.join(' · ')} |
| Landing ("${config.projects.landing.name}") | \`${LANDING_ID}\` | ${landingCount} | landing |

### Consumer app registry

| Key | Name | Repo path | Stack |
|---|---|---|---|
${Object.entries(config.apps).map(([k,v]) => `| \`${k}\` | ${v.name} | \`${v.repo}\` | ${v.stack} |`).join('\n')}

---

## 2. Domain × App ownership matrix

| Domain | Tables (n) | ${appKeys.join(' | ')} |
|---|---|${appKeys.map(() => '---').join('|')}|
${Object.entries(config.domains).map(([key, d]) => {
  const count = d.tables.filter(name => sharedTables.find(t => t.table_name === name)).length
  const appsInDomain = new Set(d.tables.flatMap(name => config.ownership[name] ?? []))
  const cells = appKeys.map(a => appsInDomain.has(a) ? '✓' : '').join(' | ')
  return `| **${key}** | ${count} | ${cells} |`
}).join('\n')}

---

## 3. Shared DB, table directory (${sharedCount} tables)

Legend: RLS ✓ = enabled · ✗ = **DISABLED (security risk)**

${Object.keys(config.domains).map(key => domainSection(key, sharedTables, sharedFKs)).join('\n\n')}

---

## 4. Orphaned / deprecated tables

Confirmed zero references across all consumer apps:

| Table | Reason |
|---|---|
${orphanSection(sharedTables)}

---

## 5. Landing DB, table directory (${landingCount} tables)

Project \`${LANDING_ID}\` ("${config.projects.landing.name}"). Used only by \`kiongozi-platform-v1\`.

${landingSection(landingTables)}
${newTablesSection(sharedTables)}
---

## 6. Key FK relationship chains

\`\`\`
auth.users
  └─ profiles (id)
       ├─ courses (author_id) ──── course_modules ──── learning_modules
       │                      └─ course_enrollments, course_reviews, quizzes
       ├─ conversations (user_id) ── messages ── message_analytics
       │                         └─ chat_sessions
       ├─ posts (user_id) ── post_likes, post_media, post_hashtags
       │                 └─ mentions, bookmarks, reports
       ├─ dm_conversations ← dm_participants ← dm_messages
       ├─ user_progress (module_id → learning_modules)
       ├─ social_petitions ← social_petition_signatures
       └─ public_funds ← fund_allocations, fund_disbursements
                      └─ public_projects ← project_updates ← project_media

welfare_funds (RLS off)
  └─ fund_alerts (RLS off)
\`\`\`

---

## 7. How to update this file

\`\`\`bash
# Local
export SUPABASE_ACCESS_TOKEN=your_pat   # supabase.com/dashboard/account/tokens
node scripts/generate-db-map.mjs

# CI fires automatically on merged migrations via .github/workflows/update-db-map.yml
\`\`\`

To add a new consumer app or reassign table ownership, edit \`scripts/db-map-config.json\` then re-run the script.
`

  const outPath = join(ROOT, 'DATABASE_MAP.md')
  writeFileSync(outPath, md, 'utf8')
  console.log(`✓ DATABASE_MAP.md updated (${sharedCount} shared tables, ${landingCount} landing tables)`)
}

main().catch(e => { console.error(e); process.exit(1) })

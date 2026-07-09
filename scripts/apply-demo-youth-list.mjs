import { readFileSync } from 'node:fs';
import { serviceClient } from './_supabase.mjs';

const BATCH_ID = process.env.DEMO_BATCH_ID || 'youth-demo-2026-07-09';
const NAME_LIST_PATH = process.argv[2] || process.env.DEMO_NAME_LIST_PATH;

if (!NAME_LIST_PATH) {
  console.error('Usage: node scripts/apply-demo-youth-list.mjs <name-list-markdown-path>');
  process.exit(1);
}

const typoPairs = [
  ['information', 'infomation'],
  ['process', 'proccess'],
  ['actually', 'actully'],
  ['support', 'suport'],
  ['timeline', 'timline'],
  ['clearer', 'cleaer'],
  ['community', 'commuity'],
  ['implementation', 'implemetation'],
  ['because', 'becuase'],
  ['people', 'ppl']
];

function parseProvidedNames(raw) {
  return raw
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+\s*\|/.test(line))
    .map((line) => {
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim().replace(/\s+/g, ' '));
      return {
        sourceId: Number(cells[0]),
        gender: cells[1]?.toLowerCase(),
        firstName: cells[2],
        lastName: cells[3],
        fullName: cells[4],
        community: cells[5]
      };
    })
    .filter((row) => row.sourceId && row.firstName && row.lastName && row.fullName);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function addOccasionalTypo(text, index) {
  if (index % 3 !== 1) return text;
  const pair = typoPairs.find(([word]) => new RegExp(`\\b${word}\\b`, 'i').test(text));
  if (!pair) return `${text} bana`;
  return text.replace(new RegExp(`\\b${pair[0]}\\b`, 'i'), pair[1]);
}

function demoText(text, index = 0) {
  if (!text) return text;
  return addOccasionalTypo(String(text), index)
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function updateProfiles(nameRows) {
  const { data: profiles, error } = await serviceClient
    .from('profiles')
    .select('id, email, gender, county, learning_interests')
    .like('email', 'ky-demo-youth-%@example.com')
    .order('email', { ascending: true })
    .limit(300);

  if (error) throw new Error(`Unable to load demo profiles: ${error.message}`);
  if (!profiles?.length) throw new Error('No demo profiles found for ky-demo-youth emails');

  const rows = profiles.map((profile, index) => {
    const providedName = nameRows[index % nameRows.length];
    const gender = providedName.gender;
    const repeat = Math.floor(index / nameRows.length);
    const username = `${slugify(providedName.firstName)}_${slugify(providedName.lastName)}${repeat > 0 ? `_${repeat + 1}` : ''}`;
    const interests = profile.learning_interests?.length
      ? profile.learning_interests
      : ['governance', 'climate', 'public participation'];

    return {
      id: profile.id,
      email: profile.email,
      first_name: providedName.firstName,
      last_name: providedName.lastName,
      full_name: providedName.fullName,
      username,
      bio: demoText(`Youth from ${profile.county || 'Kenya'} interested in ${interests.slice(0, 2).join(', ')} and local development`, index),
      is_bot: true,
      role: 'user',
      updated_at: new Date().toISOString(),
      metadata: {
        gender,
        community: providedName.community,
        source_name_id: providedName.sourceId
      }
    };
  });

  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100).map(({ metadata, ...row }) => row);
    const { error: updateError } = await serviceClient
      .from('profiles')
      .upsert(chunk, { onConflict: 'id' });
    if (updateError) throw new Error(`Profile update failed: ${updateError.message}`);
  }

  const labelRows = rows.map((row) => ({
    batch_id: BATCH_ID,
    table_schema: 'public',
    table_name: 'profiles',
    record_id: row.id,
    record_key: row.id,
    persona_user_id: row.id,
    is_seed_data: true,
    source: 'synthetic_demo',
    visibility: 'demo_only',
    created_for: 'platform_seed_data',
    replace_with_real_activity: true,
    metadata: row.metadata
  }));

  for (let i = 0; i < labelRows.length; i += 100) {
    const { error: labelError } = await serviceClient
      .from('synthetic_demo_records')
      .upsert(labelRows.slice(i, i + 100), { onConflict: 'table_schema,table_name,record_key' });
    if (labelError) throw new Error(`Profile label update failed: ${labelError.message}`);
  }

  return rows.length;
}

async function labeledIds(tableName) {
  const { data, error } = await serviceClient
    .from('synthetic_demo_records')
    .select('record_id, record_key')
    .in('batch_id', [BATCH_ID, 'bot-engagement-auto'])
    .eq('table_name', tableName)
    .limit(1000);
  if (error) throw new Error(`Unable to load labels for ${tableName}: ${error.message}`);
  return (data || []).map((row) => row.record_id || row.record_key).filter(Boolean);
}

async function cleanContentTable(tableName, textColumn) {
  const ids = await labeledIds(tableName);
  let updated = 0;

  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data, error } = await serviceClient
      .from(tableName)
      .select(`id, ${textColumn}`)
      .in('id', chunk);
    if (error) throw new Error(`Unable to load ${tableName}: ${error.message}`);

    for (const [offset, row] of (data || []).entries()) {
      const next = demoText(row[textColumn], i + offset);
      if (next !== row[textColumn]) {
        const { error: updateError } = await serviceClient
          .from(tableName)
          .update({ [textColumn]: next })
          .eq('id', row.id);
        if (updateError) throw new Error(`Unable to update ${tableName}: ${updateError.message}`);
        updated += 1;
      }
    }
  }

  return updated;
}

async function cleanQueueDrafts() {
  const { data, error } = await serviceClient
    .from('bot_engagement_queue')
    .select('id, draft_content')
    .not('draft_content', 'is', null)
    .limit(1000);
  if (error) throw new Error(`Unable to load bot queue: ${error.message}`);

  let updated = 0;
  for (const [index, row] of (data || []).entries()) {
    const next = demoText(row.draft_content, index);
    if (next !== row.draft_content) {
      const { error: updateError } = await serviceClient
        .from('bot_engagement_queue')
        .update({ draft_content: next, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (updateError) throw new Error(`Unable to update bot queue: ${updateError.message}`);
      updated += 1;
    }
  }
  return updated;
}

async function main() {
  const names = parseProvidedNames(readFileSync(NAME_LIST_PATH, 'utf8'));
  if (names.length < 2) throw new Error('Name list did not contain usable rows');

  const profileCount = await updateProfiles(names);
  const contentUpdates = {};
  for (const [table, column] of [
    ['social_posts', 'content'],
    ['social_comments', 'content'],
    ['poll_comments', 'content'],
    ['fund_comments', 'content'],
    ['project_updates', 'content'],
    ['fund_accountability_responses', 'response_text'],
    ['civic_programme_responses', 'response_text']
  ]) {
    contentUpdates[table] = await cleanContentTable(table, column);
  }
  contentUpdates.bot_engagement_queue = await cleanQueueDrafts();

  console.log(JSON.stringify({
    batchId: BATCH_ID,
    parsedNames: names.length,
    updatedProfiles: profileCount,
    contentUpdates
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

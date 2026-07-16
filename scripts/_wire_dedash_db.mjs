// Sweep remaining en/em dashes from course + module TEXT fields in the DB.
// Safe transform (only dash chars + adjacent horizontal spaces). DRY unless --apply.
import { serviceClient } from './_supabase.mjs';
const APPLY = process.argv.includes('--apply');
const D = /[–—]/;

function fix(t) {
  if (t == null) return t;
  let s = String(t);
  s = s.replace(/(\d)[ \t]*[–—][ \t]*(\d)/g, '$1 to $2');   // ranges
  s = s.replace(/[ \t]*[–—][ \t]*([.!?;:,])/g, '$1');        // dash before punct
  s = s.replace(/([.!?;:,])[ \t]*[–—][ \t]*/g, '$1 ');       // dash after punct
  s = s.replace(/[ \t]*[–—][ \t]*/g, ', ');                  // general inline
  s = s.replace(/, ,/g, ',').replace(/,,/g, ',');
  return s;
}

async function sweep(table, fields) {
  const { data, error } = await serviceClient.from(table).select(['id', ...fields].join(','));
  if (error) { console.log(`${table}: ${error.message}`); return; }
  let hits = 0, applied = 0;
  for (const row of data) {
    const patch = {};
    for (const f of fields) {
      if (row[f] && D.test(row[f])) {
        const nf = fix(row[f]);
        if (nf !== row[f]) { patch[f] = nf; hits++; }
      }
    }
    if (Object.keys(patch).length) {
      if (!APPLY) {
        for (const [f, v] of Object.entries(patch)) console.log(`  ${table}.${f} [${row.id.slice(0, 8)}]: ...${(row[f].match(/.{0,25}[–—].{0,25}/) || [''])[0]}...`);
      } else {
        const { error: uErr } = await serviceClient.from(table).update(patch).eq('id', row.id);
        if (uErr) console.log(`  UPDATE FAIL ${table} ${row.id}: ${uErr.message}`); else applied++;
      }
    }
  }
  console.log(`${table}: ${hits} field(s) with dashes${APPLY ? `, ${applied} rows updated` : ''}`);
}

console.log(APPLY ? '=== APPLY ===' : '=== DRY-RUN ===');
await sweep('courses', ['title', 'description', 'overview']);
await sweep('learning_modules', ['title', 'description', 'content']);

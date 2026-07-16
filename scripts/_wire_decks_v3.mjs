// Replace the 18 existing courses' slide decks with the new v3 decks.
// Uploads each deck.pdf to the `courses` storage bucket and repoints
// courses.slides_url / slides_type. Backs up the previous values first.
// DRY-RUN by default; pass --apply to write.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { serviceClient, SUPABASE_URL } from './_supabase.mjs';

const APPLY = process.argv.includes('--apply');
const DECKS = 'C:/Users/user/AppData/Local/Temp/claude/c--Users-user-Desktop-Kiongozi-LMS/a0550216-3e43-43d2-8c26-ede7c0eaaa9c/scratchpad/deckgen/out';
const BUCKET = 'courses';

// slug -> live course_id (verified from the courses table)
const MAP = {
  'ai-powered-civic-tech': '77920307-0e8d-4f34-8261-1b93489d2f2d',
  'business-advocacy-strategy-in-practice': 'fbc457f4-0802-419d-9664-385d059ff066',
  'climate-policy-and-international-law': 'a851c191-6482-48d7-bbef-0c6f3662ac90',
  'community-organizing-101': '962ceb66-af41-43a2-874f-d88814dea89c',
  'diagnosing-impact-proving-the-cure': '78c3575a-0d5c-4da5-98f8-e345f4b06239',
  'digital-government-and-open-data': 'b837a95a-3ddf-4b71-947b-d3cc6c6be070',
  'entrepreneurship-education-training': '0f5c4001-5830-439f-8133-cfa4cf2870ce',
  'funding-and-pitching-masters': 'f8dace8c-58b4-49f0-94eb-5d6863c1ce19',
  'grassroots-environmental-activism': '1ae63390-1126-4a7f-82f2-8c4e19902c50',
  'introduction-to-climate-science': '7752b3c9-9ebf-404c-bdf3-b7b1eb466dfb',
  'product-development-essentials': '70987bbe-a945-4b03-9034-9b2b78fcd7a7',
  'renewable-energy-transition': '4f19ce95-5ff0-4910-8840-e61da52b214b',
  'sheria-ya-vijana-entrepreneurship-edition': 'f27d6801-58b8-48a2-a40f-f69b898d7625',
  'sustainable-business-practices': '4743dcf1-8dbf-4d8c-81a7-e7db38b64105',
  'the-advocacy-impact-engine': '4900fb28-5c1c-46ff-8ef6-a3b8ad11bfba',
  'the-youth-builder-blueprint': 'c8e7dac3-fc4a-4154-a3cd-3cc88ffad233',
  'the-youth-leadership-blueprint': '19dd7706-d89b-44ea-93f4-1b866d102f83',
  'venture-creation-from-idea-to-launch': '437c9a22-658a-4fef-985d-da219513aec8',
};

const backup = [];
const manifest = [];
let ok = 0;

for (const [slug, courseId] of Object.entries(MAP)) {
  const pdfPath = `${DECKS}/${slug}/deck.pdf`;
  if (!existsSync(pdfPath)) { console.log(`MISSING PDF  ${slug}`); continue; }
  const bytes = readFileSync(pdfPath);
  const storagePath = `course-assets/${courseId}/v3/${slug}.pdf`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;

  // read current values for backup
  const { data: cur, error: selErr } = await serviceClient
    .from('courses').select('title, slides_url, slides_type').eq('id', courseId).single();
  if (selErr) { console.log(`SELECT FAIL ${slug}: ${selErr.message}`); continue; }

  console.log(`${APPLY ? 'APPLY' : 'DRY  '}  ${slug}  (${(bytes.length / 1024).toFixed(0)}kb)  -> ${storagePath}`);
  console.log(`        old slides_url: ${cur.slides_url}`);

  if (APPLY) {
    const { error: upErr } = await serviceClient.storage.from(BUCKET)
      .upload(storagePath, bytes, { contentType: 'application/pdf', cacheControl: '3600', upsert: true });
    if (upErr) { console.log(`  UPLOAD FAIL: ${upErr.message}`); continue; }
    const { error: updErr } = await serviceClient.from('courses')
      .update({ slides_url: publicUrl, slides_type: 'pdf' }).eq('id', courseId);
    if (updErr) { console.log(`  UPDATE FAIL: ${updErr.message}`); continue; }
  }
  backup.push({ course_id: courseId, title: cur.title, prev_slides_url: cur.slides_url, prev_slides_type: cur.slides_type });
  manifest.push({ slug, course_id: courseId, title: cur.title, storage_path: storagePath, public_url: publicUrl });
  ok++;
}

console.log(`\n${APPLY ? 'APPLIED' : 'DRY-RUN'}: ${ok}/${Object.keys(MAP).length} decks`);
if (APPLY) {
  writeFileSync('output/pdf/deck-v3-backup.json', JSON.stringify(backup, null, 2));
  writeFileSync('output/pdf/deck-v3-manifest.json', JSON.stringify(manifest, null, 2));
  console.log('Wrote output/pdf/deck-v3-backup.json (rollback data) + deck-v3-manifest.json');
}

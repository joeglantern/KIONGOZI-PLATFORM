// Create the 3 brand-new courses (course row + learning_modules + join),
// then attach each deck as slides_url. DRY-RUN unless --apply.
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { serviceClient, SUPABASE_URL } from './_supabase.mjs';

const APPLY = process.argv.includes('--apply');
const DECKGEN = 'C:/Users/user/AppData/Local/Temp/claude/c--Users-user-Desktop-Kiongozi-LMS/a0550216-3e43-43d2-8c26-ede7c0eaaa9c/scratchpad/deckgen';
const BUCKET = 'courses';
const AUTHOR = '08be0480-70a5-4e3d-9c22-e4f789a90d7b';       // reuse existing author
const CAT_DIGITAL = '6d6650ae-8776-42c4-a749-10a7ca5f615f';   // "Digital Skills"
const now = new Date().toISOString();

const COURSES = [
  {
    slug: 'computer-basic-skills',
    title: 'Computer Basic Skills',
    hours: 6,
    description: 'A complete beginners course for anyone who has never used a computer. Learn the parts, find your way around, manage files, get online, use email, and stay safe, one small win at a time.',
    overview: 'Six short modules that assume zero prior experience. Every module ends with a real task you can do yourself, from saving your first file to spotting a scam email.',
    prerequisites: ['None. This course starts from zero.'],
    learning_outcomes: [
      'Identify the main parts of a computer and turn it on and off safely',
      'Open, use, and close programs and adjust basic settings',
      'Create, save, name, and organise your files and folders',
      'Browse the web, use email, and recognise and avoid common online scams',
    ],
  },
  {
    slug: 'productivity-packages',
    title: 'Productivity Packages',
    hours: 5,
    description: 'A task-driven course in the everyday office tools. You will build a real CV, a working budget, a short pitch deck, and a shared cloud file, learning the tools by finishing something useful each time.',
    overview: 'Five modules, each building one real artifact end to end with a word processor, a spreadsheet, a slides app, and the cloud. Works with both Microsoft Office and Google tools.',
    prerequisites: ['Basic comfort using a computer. See Computer Basic Skills.'],
    learning_outcomes: [
      'Write and format a clean one-page CV or letter and export it to PDF',
      'Build a budget spreadsheet with formulas, sorting, and a chart',
      'Design and deliver a focused five-slide pitch',
      'Share and collaborate on files in the cloud without emailing versions around',
    ],
  },
  {
    slug: 'artificial-intelligence-essentials',
    title: 'Artificial Intelligence Essentials',
    hours: 5,
    description: 'A practical, honest introduction to using AI well. Learn what AI actually is, how to prompt it, how to judge its output, where it fails, and how to use it responsibly.',
    overview: 'Six modules that move from what AI is, and is not, through prompting, verifying output, understanding limits, and using AI ethically. Grounded in everyday examples, with no hype.',
    prerequisites: ['Basic comfort using a computer and the internet.'],
    learning_outcomes: [
      'Explain in plain terms what AI is and is not',
      'Write clear prompts that get useful results',
      'Judge AI output critically and verify facts before trusting them',
      'Use AI responsibly, protecting privacy and keeping human judgment in charge',
    ],
  },
];

const mdI = (s = '') => String(s).replace(/\[\[(.+?)\]\]/g, '**$1**');
function moduleToMd(slides) {
  let md = '';
  for (const s of slides) {
    switch (s.type) {
      case 'section': md += `# ${mdI(s.title)}\n\n`; if (s.subtitle) md += `_${mdI(s.subtitle)}_\n\n`; break;
      case 'bigidea': md += `## ${mdI(s.statement)}\n\n`; if (s.footnote) md += `${mdI(s.footnote)}\n\n`; break;
      case 'points': md += `### ${mdI(s.title)}\n\n`; for (const i of s.items) md += `- ${mdI(i)}\n`; md += '\n'; if (s.note) md += `> ${mdI(s.note)}\n\n`; break;
      case 'diagram': case 'diagramC': if (s.title) md += `### ${mdI(s.title)}\n\n`; if (s.lead) md += `${mdI(s.lead)}\n\n`; if (s.items) { for (const i of s.items) md += `- ${mdI(i)}\n`; md += '\n'; } if (s.caption) md += `_${mdI(s.caption)}_\n\n`; break;
      case 'example': md += `### ${mdI(s.title)}\n\n`; for (const p of s.body) md += `${mdI(p.t || p)}\n\n`; if (s.highlight) md += `> ${mdI(s.highlight)}\n\n`; break;
      case 'steps': md += `### ${mdI(s.title)}\n\n`; s.steps.forEach((st, i) => md += `${i + 1}. **${mdI(st.h)}.** ${st.b ? mdI(st.b) : ''}\n`); md += '\n'; if (s.task) md += `> **Your task.** ${mdI(s.task)}\n\n`; break;
      case 'compare': md += `### ${mdI(s.title)}\n\n`; md += `**${mdI(s.keepHead)}**\n\n`; for (const i of s.keep) md += `- ${mdI(i)}\n`; md += `\n**${mdI(s.cutHead)}**\n\n`; for (const i of s.cut) md += `- ${mdI(i)}\n`; md += '\n'; break;
      case 'checkq': md += `### Check yourself\n\n${mdI(s.question)}\n\n`; break;
      case 'checka': md += `**Answer.** ${mdI(s.answer)}\n\n`; break;
      case 'quote': md += `> ${mdI(s.text)}\n>\n> *${mdI(s.who || '')}*\n\n`; break;
      case 'summary': md += `### ${mdI(s.title)}\n\n`; for (const i of s.points) md += `- ${mdI(i)}\n`; md += '\n'; break;
      case 'checklist': md += `### ${mdI(s.title)}\n\n`; for (const i of s.items) md += `- ${mdI(i)}\n`; md += '\n'; break;
      case 'closing': md += `## ${mdI(s.statement)}\n\n`; if (s.sub) md += `${mdI(s.sub)}\n\n`; break;
    }
  }
  return md.trim();
}

function splitModules(slides) {
  const idxs = slides.map((s, i) => s.type === 'section' ? i : -1).filter(i => i >= 0);
  return idxs.map((start, k) => {
    const end = k + 1 < idxs.length ? idxs[k + 1] : slides.length;
    const group = slides.slice(start, end);
    const sec = group[0];
    return { title: sec.title, subtitle: sec.subtitle || '', md: moduleToMd(group) };
  });
}

const dash = t => (t.match(/[–—]/g) || []).length;
let dashTotal = 0;

for (const c of COURSES) {
  const deck = (await import(pathToFileURL(`${DECKGEN}/decks/${c.slug}.mjs`).href)).default;
  const mods = splitModules(deck.slides);
  const perMin = Math.round((c.hours * 60) / mods.length);
  const pdfPath = `${DECKGEN}/out/${c.slug}/deck.pdf`;
  const dcount = dash(c.description + c.overview + mods.map(m => m.md).join(''));
  dashTotal += dcount;
  console.log(`\n${APPLY ? 'APPLY' : 'DRY'}  ${c.title}  (${mods.length} modules, ${c.hours}h, pdf ${existsSync(pdfPath) ? 'OK' : 'MISSING'}, dashes=${dcount})`);
  mods.forEach((m, i) => console.log(`   M${i + 1}. ${m.title}  (${m.md.length} chars md)`));

  if (!APPLY) continue;

  // guard: skip if a live course with this title already exists
  const { data: existing } = await serviceClient.from('courses').select('id').eq('title', c.title).is('deleted_at', null);
  if (existing && existing.length) { console.log(`   SKIP: course already exists (${existing[0].id})`); continue; }

  // 1) course row
  const { data: course, error: cErr } = await serviceClient.from('courses').insert({
    title: c.title, description: c.description, overview: c.overview,
    category_id: CAT_DIGITAL, difficulty_level: 'beginner', estimated_duration_hours: c.hours,
    prerequisites: c.prerequisites, learning_outcomes: c.learning_outcomes,
    author_id: AUTHOR, status: 'published', review_status: 'approved', published_at: now,
    slides_type: 'pdf',
  }).select('id').single();
  if (cErr) { console.log(`   COURSE INSERT FAIL: ${cErr.message}`); continue; }
  const courseId = course.id;

  // 2) learning_modules
  const modRows = mods.map(m => ({
    title: m.title, description: m.subtitle || null, content: m.md,
    category_id: CAT_DIGITAL, difficulty_level: 'beginner', estimated_duration_minutes: perMin,
    learning_objectives: [], author_id: AUTHOR, status: 'published', published_at: now,
  }));
  const { data: insMods, error: mErr } = await serviceClient.from('learning_modules').insert(modRows).select('id');
  if (mErr) { console.log(`   MODULES INSERT FAIL: ${mErr.message}`); continue; }

  // 3) course_modules join
  const joins = insMods.map((mm, i) => ({ course_id: courseId, module_id: mm.id, order_index: i + 1, is_required: true }));
  const { error: jErr } = await serviceClient.from('course_modules').insert(joins);
  if (jErr) { console.log(`   JOIN INSERT FAIL: ${jErr.message}`); continue; }

  // 4) upload deck + set slides_url
  const storagePath = `course-assets/${courseId}/v3/${c.slug}.pdf`;
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  const { error: upErr } = await serviceClient.storage.from(BUCKET)
    .upload(storagePath, readFileSync(pdfPath), { contentType: 'application/pdf', cacheControl: '3600', upsert: true });
  if (upErr) { console.log(`   UPLOAD FAIL: ${upErr.message}`); continue; }
  await serviceClient.from('courses').update({ slides_url: publicUrl }).eq('id', courseId);

  console.log(`   CREATED course ${courseId} + ${insMods.length} modules + deck`);
  writeFileSync(`output/pdf/new-course-${c.slug}.json`, JSON.stringify({ courseId, slides_url: publicUrl, modules: insMods.map(m => m.id) }, null, 2));
}
console.log(`\nTotal en/em dashes across new content: ${dashTotal}`);

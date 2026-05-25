/**
 * Verifies the AI policy-pulse analysis flow end-to-end:
 *   data fetch  →  prompt build  →  OpenAI call  →  store ai_insights
 *
 * Uses service-role key, bypassing the route's auth gate, so we can
 * confirm the pipeline works without simulating a logged-in session.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Find an eligible poll (response_count >= 3) — try the TVET poll if available
const { data: candidates } = await supabase
  .from('policy_polls')
  .select('id, title, response_count, ai_insights')
  .gte('response_count', 3)
  .is('ai_insights', null)
  .order('response_count', { ascending: false })
  .limit(5);

console.log('Eligible polls (>=3 responses):');
candidates?.forEach(p => console.log(' -', p.title, '|', p.response_count, 'resp |', p.ai_insights ? 'already has AI' : 'no AI yet'));

const target = candidates?.[0];
if (!target) { console.log('No eligible polls. Exiting.'); process.exit(0); }

console.log(`\n→ Running AI analysis on: "${target.title}" (${target.response_count} responses)`);

// Build the prompt (mirrors route logic)
const pollId = target.id;
const [pollR, questionsR, responsesR, submissionsR] = await Promise.all([
  supabase.from('policy_polls').select('*').eq('id', pollId).single(),
  supabase.from('poll_questions').select('*, poll_options(*)').eq('poll_id', pollId).order('question_order'),
  supabase.from('poll_responses').select('*').eq('poll_id', pollId),
  supabase.from('poll_submissions').select('id').eq('poll_id', pollId),
]);
const poll = pollR.data, questions = questionsR.data, responses = responsesR.data;
const totalRespondents = submissionsR.data?.length ?? poll.response_count ?? 0;

const sections = [
  `# Poll Data Summary`,
  `**Title:** ${poll.title}`,
  `**Category:** ${poll.category}`,
  poll.description ? `**Context:** ${poll.description}` : '',
  `**Total Respondents:** ${totalRespondents}`,
  `**Status:** ${poll.status}`,
  '', '---', '',
].filter(Boolean);

for (const q of questions) {
  const qResponses = responses.filter(r => r.question_id === q.id);
  sections.push(`## Q${q.question_order + 1}: ${q.question_text}`);
  sections.push(`*Type: ${q.question_type.replace('_', ' ')}*`);
  if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
    const opts = (q.poll_options ?? []).sort((a, b) => a.option_order - b.option_order);
    const totalVotes = opts.reduce((s, o) => s + (o.vote_count ?? 0), 0);
    sections.push(`*(${totalVotes} responses)*`, '');
    for (const opt of opts.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))) {
      const pct = totalVotes > 0 ? ((opt.vote_count / totalVotes) * 100).toFixed(1) : '0.0';
      sections.push(`- **"${opt.option_text}"** — ${pct}% (${opt.vote_count ?? 0} votes)`);
    }
  } else if (q.question_type === 'scale') {
    const values = qResponses.map(r => r.scale_value).filter(v => v != null);
    if (values.length) {
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
      sections.push(`- **Average score:** ${avg}/10  (${values.length} responses)`);
    }
  } else if (q.question_type === 'text') {
    const texts = qResponses.map(r => r.text_response).filter(t => !!t?.trim()).slice(0, 10);
    sections.push(`*(${texts.length} written responses)*`);
    texts.forEach((t, i) => sections.push(`${i + 1}. "${t.trim()}"`));
  }
  sections.push('');
}

const dataSummary = sections.join('\n');
const prompt = `You are a senior youth policy analyst with deep expertise in East African governance, civic engagement, and youth development.\n\n${dataSummary}\n\nProduce a concise (about 500-700 words) markdown report with these sections:\n- Executive Summary\n- Key Findings\n- Youth Sentiment Profile (label + 2-3 sentences)\n- Surprising Signals\n- Policy Recommendations (3-4)\n- Risks and Watchpoints\n- Research Gaps`;

console.log('Sending to OpenAI…');
const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a senior policy analyst specialising in African youth governance.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 1800,
    temperature: 0.55,
  }),
});

if (!aiRes.ok) {
  console.error('OpenAI HTTP', aiRes.status, await aiRes.text());
  process.exit(1);
}
const aiData = await aiRes.json();
const insights = aiData.choices?.[0]?.message?.content ?? '';
console.log('\n--- AI RESPONSE (first 600 chars) ---');
console.log(insights.slice(0, 600));
console.log('\n... [truncated, full length:', insights.length, 'chars] ...\n');

// Store
const { error: upErr } = await supabase
  .from('policy_polls')
  .update({ ai_insights: insights, insights_generated_at: new Date().toISOString() })
  .eq('id', pollId);
if (upErr) { console.error('Save failed:', upErr); process.exit(1); }

console.log(`✓ Saved AI insights to poll ${pollId}`);
console.log(`  Tokens: prompt ~${aiData.usage?.prompt_tokens}, completion ~${aiData.usage?.completion_tokens}`);

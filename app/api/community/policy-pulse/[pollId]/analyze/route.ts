import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pollId } = await params;

    const [pollResult, questionsResult, responsesResult, submissionsResult] = await Promise.all([
        supabase.from('policy_polls').select('*').eq('id', pollId).single(),
        supabase.from('poll_questions').select('*, poll_options(*)').eq('poll_id', pollId).order('question_order'),
        supabase.from('poll_responses').select('*').eq('poll_id', pollId),
        supabase.from('poll_submissions').select('id').eq('poll_id', pollId),
    ]);

    const poll = pollResult.data;
    const questions = questionsResult.data;
    const responses = responsesResult.data;

    if (!poll || !questions || !responses) {
        return NextResponse.json({ error: 'No data' }, { status: 400 });
    }

    const totalRespondents = submissionsResult.data?.length ?? poll.response_count ?? 0;

    // Build rich, structured data summary for the AI
    const sections: string[] = [
        `# Poll Data Summary`,
        `**Title:** ${poll.title}`,
        `**Category:** ${poll.category}`,
        poll.description ? `**Context:** ${poll.description}` : '',
        `**Total Respondents:** ${totalRespondents}`,
        `**Status:** ${poll.status}`,
        poll.closes_at ? `**Closed:** ${new Date(poll.closes_at).toLocaleDateString('en-KE', { dateStyle: 'long' })}` : '',
        '',
        '---',
        '',
    ].filter(Boolean);

    for (const q of questions) {
        const qResponses = responses.filter(r => r.question_id === q.id);
        sections.push(`## Q${q.question_order + 1}: ${q.question_text}`);
        sections.push(`*Type: ${q.question_type.replace('_', ' ')}*`);

        if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
            const opts = (q.poll_options ?? []).sort((a: any, b: any) => a.option_order - b.option_order);
            const totalVotes = opts.reduce((sum: number, o: any) => sum + (o.vote_count ?? 0), 0);
            const isMultiple = q.question_type === 'multiple_choice';

            sections.push(isMultiple
                ? `*(Multiple choice — respondents could select several options; ${totalVotes} total selections from ${qResponses.length} responses)*`
                : `*(${totalVotes} responses)*`
            );
            sections.push('');

            const sortedOpts = [...opts].sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
            for (const opt of sortedOpts) {
                const count = opt.vote_count ?? 0;
                const pct = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0';
                const bar = '█'.repeat(Math.round(Number(pct) / 10)).padEnd(10, '░');
                sections.push(`- **"${opt.option_text}"** — ${pct}% (${count} votes) ${bar}`);
            }

            if (sortedOpts.length >= 2 && totalVotes > 0) {
                const top = sortedOpts[0];
                const second = sortedOpts[1];
                const topPct = ((top.vote_count / totalVotes) * 100).toFixed(0);
                const secPct = ((second.vote_count / totalVotes) * 100).toFixed(0);
                sections.push('');
                sections.push(`> **Dominant:** "${top.option_text}" (${topPct}%) — runner-up "${second.option_text}" (${secPct}%)`);
                if (Math.abs(top.vote_count - second.vote_count) <= 1 && totalVotes > 2) {
                    sections.push(`> ⚠️ *Near tie — opinion is divided*`);
                }
            }

        } else if (q.question_type === 'scale') {
            const values = qResponses.map(r => r.scale_value).filter((v): v is number => v != null);
            if (values.length > 0) {
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const sorted = [...values].sort((a, b) => a - b);
                const median = sorted[Math.floor(sorted.length / 2)];
                const low = values.filter(v => v <= 3).length;
                const mid = values.filter(v => v >= 4 && v <= 7).length;
                const high = values.filter(v => v >= 8).length;
                const lowPct = ((low / values.length) * 100).toFixed(0);
                const midPct = ((mid / values.length) * 100).toFixed(0);
                const highPct = ((high / values.length) * 100).toFixed(0);

                const dist: Record<number, number> = {};
                for (let i = 1; i <= 10; i++) dist[i] = 0;
                values.forEach(v => { dist[v] = (dist[v] ?? 0) + 1; });

                sections.push(`- **Average score:** ${avg.toFixed(2)}/10 (Median: ${median}/10)`);
                sections.push(`- **Distribution:** Low (1-3): ${lowPct}% · Neutral (4-7): ${midPct}% · High (8-10): ${highPct}%`);
                sections.push(`- **Histogram:** ${Object.entries(dist).map(([k, v]) => `${k}:${'■'.repeat(v || 0)}`).join('  ')}`);
                sections.push(`- **Sample size:** ${values.length} responses`);

                if (avg >= 8) sections.push(`> 🟢 *Strong positive sentiment*`);
                else if (avg >= 6) sections.push(`> 🟡 *Moderate support*`);
                else if (avg >= 4) sections.push(`> 🟠 *Divided*`);
                else sections.push(`> 🔴 *Low support*`);
            }

        } else if (q.question_type === 'text') {
            const texts = qResponses
                .map(r => r.text_response)
                .filter((t): t is string => !!t?.trim())
                .slice(0, 15);

            sections.push(`*(${texts.length} written responses)*`);
            sections.push('');
            if (texts.length > 0) {
                sections.push('**Sample verbatim responses:**');
                texts.forEach((t, i) => sections.push(`${i + 1}. "${t.trim()}"`));
            } else {
                sections.push('*No written responses recorded.*');
            }
        }

        sections.push('');
    }

    const dataSummary = sections.join('\n');

    const systemPrompt = `You are a senior policy analyst specialising in African youth governance. You produce rigorous, evidence-based policy briefs. You write with authority and precision, citing specific data. You never produce vague or generic output.`;

    const prompt = `You are a senior youth policy analyst with deep expertise in East African governance, civic engagement, and youth development. You have just received structured survey data from a youth policy poll run on the Kiongozi civic platform — a platform empowering African youth to engage with public policy.

Analyze this data and produce a **compelling, rigorous, and publication-ready policy insights brief**. Your audience includes policymakers, civil society leaders, and youth advocacy organisations. Write with authority, precision, and genuine analytical depth.

${dataSummary}

---

Produce a structured markdown report using EXACTLY this format. Be specific, cite the data, and write like a professional analyst — not a chatbot summarising bullet points.

---

## Executive Summary
*2–3 punchy sentences. What is the single most important thing a policymaker should know from this poll? Be bold and direct.*

---

## Key Findings

For each major finding, write a bold headline followed by 1–2 sentences of analysis. Cite specific percentages. Aim for 3–5 findings ranked by significance. Example format:

**Finding 1: [Headline]**
[Analysis sentence with data.]

**Finding 2: [Headline]**
[Analysis sentence with data.]

*(continue...)*

---

## Youth Sentiment Profile

Rate overall youth sentiment on a spectrum and explain it. Use one of: *Strongly Supportive / Cautiously Optimistic / Divided / Sceptical / Deeply Concerned / Opposed*. Then write 2–3 sentences explaining what's driving the dominant emotion.

**Sentiment:** [Label]

[Explanation]

---

## Surprising Signals

What did the data reveal that is *unexpected*, *counter-intuitive*, or *particularly striking*? What patterns or tensions emerge across questions? Write 2–3 observations that a surface-level reading would miss. If opinions are divided, say so explicitly and explain why that matters.

---

## Policy Recommendations

Give 3–4 specific, actionable recommendations. Label each by urgency:

**[Quick Win | Medium-term | Structural Reform]** — *Title*
One or two sentences: what specifically should be done, and why the data justifies it.

---

## Risks and Watchpoints

What should policymakers be cautious about? Are there gaps in the data, risks of misinterpreting these results, or concerns about policy backlash? 2–3 watchpoints.

---

## Youth Voice

If there were open-text responses, quote or paraphrase the most revealing 2–3 statements. Frame them as representative voices. If no open-text responses, skip this section.

---

## Research Gaps

What does this poll *not* tell us that decision-makers need to know before acting? Identify 2–3 specific questions that need further research.

---

*Report generated by Kiongozi AI Policy Analyst · ${totalRespondents} ${totalRespondents === 1 ? 'respondent' : 'respondents'} · ${poll.category} category*

---

IMPORTANT GUIDELINES:
- Write in English. Be direct and analytical, not generic.
- Cite actual percentages and numbers from the data wherever possible.
- Acknowledge limitations if sample size is small (under 20 respondents).
- If the data shows a divided community, say so explicitly — don't paper over it.
- Keep the entire report between 500–750 words of prose (excluding headers/labels).
- Do NOT add commentary outside the template structure above.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("Missing ANTHROPIC_API_KEY");
        return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1800,
                temperature: 0.55,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Anthropic API analysis failure:', errBody);
            throw new Error(`Anthropic HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const insights = data.content?.[0]?.text ?? '';

        // Store the brief globally in the policy_polls table (for backwards compatibility)
        await supabase.from('policy_polls').update({
            ai_insights: insights,
            insights_generated_at: new Date().toISOString(),
        }).eq('id', pollId);

        // ALSO log and store as a versioned brief inside policy_briefs table (status: draft)
        // This makes sure both the generating user gets their own draft, and admins see it!
        await supabase.from('policy_briefs').insert({
            poll_id: pollId,
            title: `AI Brief: ${poll.title} (${new Date().toLocaleDateString()})`,
            content: insights,
            generated_by: user.id,
            status: 'draft'
        });

        return NextResponse.json({ insights });
    } catch (err: any) {
        console.error("AI Analysis error:", err.message);
        return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }
}

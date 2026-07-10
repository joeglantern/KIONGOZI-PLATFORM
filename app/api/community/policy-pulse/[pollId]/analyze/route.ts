import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

// Return a freshly-cached brief instead of re-calling the model if the last
// analysis for this poll is younger than this.
const CACHE_TTL_MS = 30_000;

function percent(part: number, total: number) {
    return total > 0 ? Math.round((part / total) * 100) : 0;
}

function topTextThemes(texts: string[]) {
    const themeRules = [
        { label: 'Access to finance', words: ['fund', 'loan', 'grant', 'capital', 'collateral', 'money', 'credit'] },
        { label: 'Information gaps', words: ['information', 'know', 'aware', 'notice', 'advert', 'portal', 'dashboard'] },
        { label: 'Skills and training', words: ['skill', 'training', 'mentor', 'capacity', 'learn'] },
        { label: 'Trust and transparency', words: ['trust', 'transparent', 'corrupt', 'fair', 'same groups', 'accountability'] },
        { label: 'Digital access', words: ['digital', 'internet', 'phone', 'online', 'data', 'platform'] },
    ];

    return themeRules
        .map((theme) => ({
            label: theme.label,
            count: texts.filter((text) => {
                const lower = text.toLowerCase();
                return theme.words.some((word) => lower.includes(word));
            }).length,
        }))
        .filter((theme) => theme.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 4);
}

function buildLocalPolicyBrief({
    poll,
    questions,
    responses,
    totalRespondents,
    countyBreakdown,
}: {
    poll: any;
    questions: any[];
    responses: any[];
    totalRespondents: number;
    countyBreakdown: Array<{ county: string; count: number }>;
}) {
    const textResponses = responses
        .map((response: any) => response.text_response)
        .filter((text: unknown): text is string => typeof text === 'string' && text.trim().length > 0)
        .map((text: string) => text.trim());
    const themes = topTextThemes(textResponses);

    const choiceFindings = questions
        .filter((question: any) => question.question_type === 'single_choice' || question.question_type === 'multiple_choice')
        .map((question: any) => {
            const opts = [...(question.poll_options ?? [])].sort((a: any, b: any) => (b.vote_count ?? 0) - (a.vote_count ?? 0));
            const totalVotes = opts.reduce((sum: number, opt: any) => sum + (opt.vote_count ?? 0), 0);
            const top = opts[0];
            if (!top || totalVotes === 0) return null;
            return {
                question: question.question_text,
                option: top.option_text,
                count: top.vote_count ?? 0,
                pct: percent(top.vote_count ?? 0, totalVotes),
            };
        })
        .filter(Boolean)
        .slice(0, 4);

    const scaleFindings = questions
        .filter((question: any) => question.question_type === 'scale')
        .map((question: any) => {
            const values = responses
                .filter((response: any) => response.question_id === question.id)
                .map((response: any) => response.scale_value)
                .filter((value: unknown): value is number => typeof value === 'number');
            if (!values.length) return null;
            const avg = values.reduce((sum: number, value: number) => sum + value, 0) / values.length;
            return { question: question.question_text, avg: avg.toFixed(1), count: values.length };
        })
        .filter(Boolean);

    const sampleVoices = textResponses.slice(0, 5);
    const regionalLine = countyBreakdown.length >= 2
        ? countyBreakdown.slice(0, 4).map((item) => `${item.county} (${item.count})`).join(', ')
        : 'Insufficient regional data - responses came from too few distinct counties to compare';

    const lines = [
        '## Executive Summary',
        `${poll.title} has gathered ${totalRespondents} ${totalRespondents === 1 ? 'respondent' : 'respondents'} and shows where youth attention is clustering around ${poll.category}. The strongest signal is that implementation must be visible, practical, and easy for young people to act on`,
        '',
        '## Key Findings',
        choiceFindings.length
            ? choiceFindings.map((finding: any, index: number) => `**Finding ${index + 1}: ${finding.option} leads the responses**\n${finding.pct}% selected this option on "${finding.question}", showing a clear priority area for follow-up`).join('\n\n')
            : '**Finding 1: Written participation is the main evidence base**\nThis poll currently depends more on open text responses than closed choice results, so qualitative interpretation matters',
        scaleFindings.map((finding: any) => `\n**Scale signal: ${finding.avg}/10 average**\n"${finding.question}" received ${finding.count} numeric responses`).join('\n'),
        '',
        '## Emerging Themes',
        themes.length
            ? themes.map((theme) => `**${theme.label}** - raised in about ${percent(theme.count, textResponses.length)}% of written responses`).join('\n\n')
            : 'No open-ended responses were collected - themes could not be extracted from closed-ended data alone',
        '',
        '## Frequently Mentioned Barriers',
        themes.length
            ? themes.map((theme, index) => `${index + 1}. ${theme.label}`).join('\n')
            : 'No open-ended responses were collected - barriers could not be extracted from closed-ended data alone',
        '',
        '## Youth Sentiment Profile',
        '**Sentiment:** Cautiously Optimistic',
        'Youth participation suggests willingness to engage, but the responses point to a need for clearer access routes, stronger public feedback loops, and proof that contributions lead to action',
        '',
        '## Surprising Signals',
        'The strongest pattern is not only demand for opportunity, but demand for trusted delivery. Youth want to see who benefits, how decisions are made, and what changes after public input is collected',
        '',
        '## Regional Differences',
        regionalLine,
        '',
        '## Suggested Actions for Parliament',
        '**Fund transparent youth implementation lines** - require public reporting on youth-facing funds, grants, and digital opportunity programmes',
        '**Protect feedback loops** - require agencies to publish how youth submissions shaped final policy or budget implementation',
        '',
        '## Suggested Actions for County Governments',
        '**Publish ward-level access calendars** - make application dates, eligibility, and support desks visible before deadlines',
        '**Create youth monitoring forums** - use county youth networks to validate whether programmes are reaching intended beneficiaries',
        '',
        '## Suggested Legislative & Policy Amendments',
        poll.description?.toLowerCase().includes('finance bill')
            ? 'Add an implementation schedule requiring youth-access reporting for green funds, innovation grants, and digital business opportunities under Finance Bill 2026 implementation'
            : 'No specific legislative instrument was named for this poll - recommendations above apply to general policy design',
        '',
        '## Risks and Watchpoints',
        totalRespondents < 20
            ? `The sample size is still small at ${totalRespondents} respondents, so this brief should guide follow-up engagement rather than be treated as nationally representative`
            : 'The response base is useful, but decision-makers should still compare it with county-level and sector-level administrative data',
        'Closed-ended results can hide the reasons behind youth choices, so open-text responses should remain part of future polls',
        '',
        sampleVoices.length ? '## Curated Youth Voices' : '',
        sampleVoices.map((voice) => `- "${voice}"`).join('\n'),
        '',
        '## Research Gaps',
        'Which counties have the largest information gaps around youth funds and innovation grants',
        'Which barriers are administrative, financial, digital, or trust-based',
        'Which follow-up actions would make youth more likely to participate again',
        '',
        `*Report generated by Kiongozi policy brief fallback - ${totalRespondents} ${totalRespondents === 1 ? 'respondent' : 'respondents'} - ${poll.category} category*`,
    ];

    return lines.filter(Boolean).join('\n\n');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Guard the expensive Sonnet call against rapid repeats.
    const limit = rateLimit(`poll-analyze:${user.id}`, 5, 60 * 1000);
    if (!limit.success) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        );
    }

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

    // Short-TTL cache: if a brief was generated moments ago, reuse it rather
    // than paying for another model call on a rapid re-request.
    if (poll.ai_insights && poll.insights_generated_at) {
        const age = Date.now() - new Date(poll.insights_generated_at).getTime();
        if (age >= 0 && age < CACHE_TTL_MS) {
            return NextResponse.json({ insights: poll.ai_insights, cached: true });
        }
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

    // Regional (county) distribution — county is sourced from the respondent's
    // profile at submission time, so anonymous respondents (no profile) are
    // excluded from this breakdown.
    const respondentKey = (r: any) => r.user_id ?? r.anon_session_id ?? r.id;
    const countyMap = new Map<string, Set<string>>();
    for (const r of responses) {
        if (!r.county) continue;
        if (!countyMap.has(r.county)) countyMap.set(r.county, new Set());
        countyMap.get(r.county)!.add(respondentKey(r));
    }
    const countyBreakdown = [...countyMap.entries()]
        .map(([county, keys]) => ({ county, count: keys.size }))
        .sort((a, b) => b.count - a.count);

    if (countyBreakdown.length > 0) {
        sections.push('## Regional Distribution');
        sections.push(`*(${countyBreakdown.length} ${countyBreakdown.length === 1 ? 'county' : 'counties'} represented; anonymous respondents without a profile are excluded from this breakdown)*`);
        sections.push('');
        countyBreakdown.forEach(({ county, count }) => sections.push(`- **${county}:** ${count} ${count === 1 ? 'respondent' : 'respondents'}`));
        sections.push('');
    }

    const dataSummary = sections.join('\n');

    const saveInsights = async (insights: string, source: 'anthropic' | 'fallback') => {
        const generatedAt = new Date().toISOString();

        const { error: pollUpdateError } = await supabase.from('policy_polls').update({
            ai_insights: insights,
            insights_generated_at: generatedAt,
        }).eq('id', pollId);

        if (pollUpdateError) throw pollUpdateError;

        const { error: briefInsertError } = await supabase.from('policy_briefs').insert({
            poll_id: pollId,
            title: `${source === 'fallback' ? 'Structured Brief' : 'AI Brief'}: ${poll.title} (${new Date().toLocaleDateString()})`,
            content: insights,
            generated_by: user.id,
            status: 'draft'
        });

        if (briefInsertError) throw briefInsertError;
    };

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

## Emerging Themes

Read every open-ended (text) response above and cluster them into named themes (e.g. "Access to Startup Capital", "Skills Gap", "Distrust of Application Process"). For each theme, give a short label, the approximate share of respondents who raised it, and 1 sentence of what respondents are actually saying. If there are no open-ended responses, write: *"No open-ended responses were collected — themes could not be extracted from closed-ended data alone."* and stop this section there.

---

## Frequently Mentioned Barriers

From the open-ended responses only, list the specific obstacles, blockers, or frustrations that came up repeatedly (e.g. collateral requirements, bureaucratic delays, lack of information). Rank by how often they appear. If there are no open-ended responses, write: *"No open-ended responses were collected — barriers could not be extracted from closed-ended data alone."* and stop this section there.

---

## Youth Sentiment Profile

Rate overall youth sentiment on a spectrum and explain it. Use one of: *Strongly Supportive / Cautiously Optimistic / Divided / Sceptical / Deeply Concerned / Opposed*. Then write 2–3 sentences explaining what's driving the dominant emotion.

**Sentiment:** [Label]

[Explanation]

---

## Surprising Signals

What did the data reveal that is *unexpected*, *counter-intuitive*, or *particularly striking*? What patterns or tensions emerge across questions? Write 2–3 observations that a surface-level reading would miss. If opinions are divided, say so explicitly and explain why that matters.

---

## Regional Differences

If a "Regional Distribution" data section appears above with 2 or more counties represented, compare how sentiment, themes, or barriers differ across those counties — name the counties explicitly. If only one county (or zero) is represented, write: *"Insufficient regional data — responses came from too few distinct counties to compare."* and stop this section there.

---

## Suggested Actions for Parliament

Give 2–3 specific, actionable recommendations aimed at the National Parliament (legislation, national budget lines, national programme design). Each as: **Title** — one or two sentences on what should be done and why the data justifies it.

---

## Suggested Actions for County Governments

Give 2–3 specific, actionable recommendations aimed at County Governments (devolved budget allocation, local implementation, county-level oversight). Each as: **Title** — one or two sentences on what should be done and why the data justifies it.

---

## Suggested Legislative & Policy Amendments

Look at the poll's "What / Why / How / Expected Impact" context above. If it names a specific bill, act, or policy instrument (e.g. "Finance Bill 2026"), propose 1–3 concrete textual or implementation amendments to it, justified by the response data. If no specific legislative instrument is named in the poll context, write: *"No specific legislative instrument was named for this poll — recommendations above apply to general policy design."* and stop this section there.

---

## Risks and Watchpoints

What should policymakers be cautious about? Are there gaps in the data, risks of misinterpreting these results, or concerns about policy backlash? 2–3 watchpoints.

---

## Curated Youth Voices

Select the 3–5 most revealing open-text responses and group them under the theme they best represent (from "Emerging Themes" above). Quote them verbatim, attributed only as "[Theme name]". If no open-text responses, skip this section entirely (do not include the heading).

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
- Keep the entire report between 650–950 words of prose (excluding headers/labels).
- Do NOT add commentary outside the template structure above.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("Missing ANTHROPIC_API_KEY");
        const fallbackInsights = buildLocalPolicyBrief({
            poll,
            questions,
            responses,
            totalRespondents,
            countyBreakdown,
        });

        await saveInsights(fallbackInsights, 'fallback');

        return NextResponse.json({
            insights: fallbackInsights,
            fallback: true,
            warning: 'External AI is not configured on the server, so Kiongozi generated a structured brief from the response data'
        });
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

        await saveInsights(insights, 'anthropic');

        return NextResponse.json({ insights });
    } catch (err: any) {
        console.error("AI Analysis error:", err.message);
        const fallbackInsights = buildLocalPolicyBrief({
            poll,
            questions,
            responses,
            totalRespondents,
            countyBreakdown,
        });

        await saveInsights(fallbackInsights, 'fallback');

        return NextResponse.json({
            insights: fallbackInsights,
            fallback: true,
            warning: 'External AI analysis failed, so Kiongozi generated a structured brief from the response data'
        });
    }
}

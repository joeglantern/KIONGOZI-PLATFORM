import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

const CACHE_TTL_MS = 30_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const limit = rateLimit(`programme-analyze:${user.id}`, 5, 60 * 1000);
    if (!limit.success) {
        return NextResponse.json(
            { error: 'Too many requests' },
            { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
        );
    }

    const { slug } = await params;

    const programmeResult = await supabase.from('civic_programmes').select('*').eq('slug', slug).single();
    const programme = programmeResult.data;
    if (!programme) return NextResponse.json({ error: 'Programme not found' }, { status: 404 });

    const [questionsResult, responsesResult, latestBriefResult] = await Promise.all([
        supabase.from('civic_programme_questions').select('*').eq('programme_id', programme.id).order('question_order'),
        supabase.from('civic_programme_responses').select('*').eq('programme_id', programme.id),
        supabase.from('programme_briefs').select('*').eq('programme_id', programme.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const questions = questionsResult.data;
    const responses = responsesResult.data;
    if (!questions || !responses) return NextResponse.json({ error: 'No data' }, { status: 400 });

    if (responses.length < 3) {
        return NextResponse.json({ error: 'Needs at least 3 monitoring responses to generate a brief' }, { status: 400 });
    }

    if (latestBriefResult.data?.created_at) {
        const age = Date.now() - new Date(latestBriefResult.data.created_at).getTime();
        if (age >= 0 && age < CACHE_TTL_MS) {
            return NextResponse.json({ insights: latestBriefResult.data.content, cached: true });
        }
    }

    // Regional (county/ward) distribution.
    const countyMap = new Map<string, Set<string>>();
    for (const r of responses) {
        if (!r.county) continue;
        const key = r.user_id ?? r.id;
        if (!countyMap.has(r.county)) countyMap.set(r.county, new Set());
        countyMap.get(r.county)!.add(key);
    }
    const countyBreakdown = [...countyMap.entries()].map(([county, keys]) => ({ county, count: keys.size })).sort((a, b) => b.count - a.count);
    const wards = [...new Set(responses.map(r => r.ward).filter(Boolean))];

    const sections: string[] = [
        `# ${programme.name} — Monitoring Data Summary`,
        `**Category:** ${programme.category}`,
        `**Total Responses:** ${responses.length}`,
        '',
        '---',
        '',
    ];

    for (const q of questions) {
        const qResponses = responses.filter(r => r.question_id === q.id);
        sections.push(`## Q${q.question_order}: ${q.question_text}`);
        sections.push(`*(${qResponses.length} responses)*`);
        sections.push('');

        if (q.response_type === 'yesno') {
            const yes = qResponses.filter(r => r.response_bool === true).length;
            const no = qResponses.filter(r => r.response_bool === false).length;
            const total = yes + no;
            if (total > 0) {
                sections.push(`- **Yes:** ${yes} (${((yes / total) * 100).toFixed(0)}%)`);
                sections.push(`- **No:** ${no} (${((no / total) * 100).toFixed(0)}%)`);
            }
            const withComment = qResponses.filter(r => r.response_text?.trim());
            if (withComment.length > 0) {
                sections.push('');
                sections.push('**Comments:**');
                withComment.slice(0, 10).forEach((r, i) => {
                    const tag = r.ward ? ` [${r.ward}${r.county ? `, ${r.county}` : ''}]` : r.county ? ` [${r.county}]` : '';
                    sections.push(`${i + 1}.${tag} "${r.response_text!.trim()}"`);
                });
            }
        } else {
            qResponses.slice(0, 15).forEach((r, i) => {
                const tag = r.ward ? ` [${r.ward}${r.county ? `, ${r.county}` : ''}]` : r.county ? ` [${r.county}]` : '';
                const photoTag = r.photo_url ? ' [photo evidence attached]' : '';
                if (r.response_text?.trim()) sections.push(`${i + 1}.${tag}${photoTag} "${r.response_text.trim()}"`);
                else if (photoTag) sections.push(`${i + 1}.${tag}${photoTag} (photo only, no caption)`);
            });
        }
        sections.push('');
    }

    if (countyBreakdown.length > 0) {
        sections.push('## Regional Distribution');
        sections.push(`*(${countyBreakdown.length} ${countyBreakdown.length === 1 ? 'county' : 'counties'} represented${wards.length > 0 ? `; wards mentioned: ${wards.slice(0, 15).join(', ')}` : ''})*`);
        sections.push('');
        countyBreakdown.forEach(({ county, count }) => sections.push(`- **${county}:** ${count} ${count === 1 ? 'respondent' : 'respondents'}`));
        sections.push('');
    }

    const dataSummary = sections.join('\n');

    const systemPrompt = `You are a senior monitoring & evaluation analyst specialising in Kenyan youth employment and green/digital transition programmes. You produce rigorous, evidence-based monitoring briefs. You write with authority and precision, citing specific data. You never produce vague or generic output.`;

    const prompt = `You have just received citizen-submitted monitoring data about the "${programme.name}" programme on the Kiongozi civic platform — a platform empowering African youth to hold public programmes accountable at the community level.

${dataSummary}

---

Produce a structured markdown report using EXACTLY this format. Be specific, cite the data, and write like a professional M&E analyst — not a chatbot summarising bullet points.

---

## Executive Summary
*2–3 punchy sentences. What is the single most important thing an oversight body should know about how this programme is actually performing on the ground?*

---

## Programme Reach

Based on the yes/no questions about reach and recruitment, how well is this programme actually reaching communities and wards? Cite percentages.

---

## Recurring Concerns

Cluster the open-ended comments and text responses into named recurring concerns (e.g. payment delays, unfair selection, political interference). For each: a short label, how many responses raised it, and a representative paraphrase. If there is anomaly-level concentration (e.g. 3+ reports of the same issue in one ward or county), flag it explicitly as a **Watch Item**.

---

## Equity & Inclusion

Synthesise responses about women, persons with disabilities, and marginalized youth. Is inclusion happening in practice, or only in principle?

---

## Regional Patterns

If a "Regional Distribution" section appears above with 2 or more counties, compare how reach or concerns differ across those counties/wards — name them explicitly. If only one county (or zero) is represented, write: *"Insufficient regional data — responses came from too few distinct counties to compare."* and stop this section there.

---

## Recommendations

Give 3–4 specific, actionable recommendations to programme administrators. Label each by urgency:

**[Quick Win | Medium-term | Structural Reform]** — *Title*
One or two sentences: what specifically should be done, and why the data justifies it.

---

*Report generated by Kiongozi AI Monitoring Analyst · ${responses.length} responses analysed · ${programme.category}*

---

IMPORTANT GUIDELINES:
- Write in English. Be direct and analytical, not generic.
- Cite actual numbers and quote fragments from the data wherever possible.
- Acknowledge limitations if sample size is small (under 10 responses).
- If the data shows a concerning pattern, say so explicitly — don't soften it.
- Keep the entire report between 600–900 words of prose (excluding headers/labels).
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
                temperature: 0.5,
                system: systemPrompt,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error('Anthropic API programme analysis failure:', errBody);
            throw new Error(`Anthropic HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const insights = data.content?.[0]?.text ?? '';

        await supabase.from('programme_briefs').insert({
            programme_id: programme.id,
            title: `Monitoring Brief: ${programme.name} (${new Date().toLocaleDateString()})`,
            content: insights,
            generated_by: user.id,
            status: 'draft'
        });

        return NextResponse.json({ insights });
    } catch (err: any) {
        console.error("Programme AI Analysis error:", err.message);
        return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }
}

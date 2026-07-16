import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { requireUser } from '@/lib/auth/guard';
import { callAnthropicMessage } from '@/lib/ai/anthropic';
import { buildCountyBreakdown } from '@/lib/community/analytics';

// Return a freshly-cached brief instead of re-calling the model if the last
// analysis for this fund is younger than this.
const CACHE_TTL_MS = 30_000;

export async function POST(req: NextRequest, { params }: { params: Promise<{ fundId: string }> }) {
    const gate = await requireUser();
    if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
    const { supabase, user } = gate;

    // Guard the expensive Sonnet call against rapid repeats.
    const limit = rateLimit(`fund-analyze:${user.id}`, 5, 60 * 1000);
    if (!limit.success) return tooManyRequests(limit);

    const { fundId } = await params;

    const [fundResult, questionsResult, responsesResult, latestBriefResult] = await Promise.all([
        supabase.from('public_funds').select('*').eq('id', fundId).single(),
        supabase.from('fund_accountability_questions').select('*').order('question_order'),
        supabase.from('fund_accountability_responses').select('*').eq('fund_id', fundId),
        supabase.from('fund_briefs').select('created_at').eq('fund_id', fundId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    const fund = fundResult.data;
    const questions = questionsResult.data;
    const responses = responsesResult.data;

    if (!fund || !questions || !responses) {
        return NextResponse.json({ error: 'No data' }, { status: 400 });
    }

    if (responses.length < 3) {
        return NextResponse.json({ error: 'Needs at least 3 accountability responses to generate a brief' }, { status: 400 });
    }

    // Short-TTL cache: if a brief was generated moments ago, skip re-calling the model.
    if (latestBriefResult.data?.created_at) {
        const age = Date.now() - new Date(latestBriefResult.data.created_at).getTime();
        if (age >= 0 && age < CACHE_TTL_MS) {
            const { data: cached } = await supabase.from('fund_briefs').select('*').eq('fund_id', fundId).order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (cached) return NextResponse.json({ insights: cached.content, cached: true });
        }
    }

    // Regional (county) distribution, county is sourced from the respondent's
    // profile at submission time; responses without a county are still used
    // for the questions themselves, just excluded from the geographic breakdown.
    const countyBreakdown = buildCountyBreakdown(responses, r => r.user_id ?? r.id);

    const sections: string[] = [
        `# Fund Accountability Data Summary`,
        `**Fund:** ${fund.title}`,
        `**Managing Body:** ${fund.managing_body ?? 'Not specified'}`,
        `**Sector:** ${fund.sector ?? 'Not specified'}`,
        `**Status:** ${fund.status}`,
        `**Total Amount:** ${fund.total_amount ? `${fund.currency} ${fund.total_amount}` : 'Not publicly disclosed'}`,
        `**Amount Disbursed:** ${fund.amount_disbursed ? `${fund.currency} ${fund.amount_disbursed}` : 'No data yet'}`,
        `**Total Accountability Responses:** ${responses.length}`,
        '',
        '---',
        '',
    ];

    for (const q of questions) {
        const qResponses = responses.filter(r => r.question_id === q.id);
        sections.push(`## Q${q.question_order}: ${q.question_text}`);
        sections.push(`*(${qResponses.length} responses)*`);
        sections.push('');
        if (qResponses.length > 0) {
            qResponses.slice(0, 20).forEach((r, i) => {
                const countyTag = r.county ? ` [${r.county}]` : '';
                const evidenceTag = r.evidence_image_url ? ' [photo evidence attached]' : '';
                sections.push(`${i + 1}.${countyTag}${evidenceTag} "${r.response_text.trim()}"`);
            });
        } else {
            sections.push('*No responses recorded for this question.*');
        }
        sections.push('');
    }

    if (countyBreakdown.length > 0) {
        sections.push('## Regional Distribution');
        sections.push(`*(${countyBreakdown.length} ${countyBreakdown.length === 1 ? 'county' : 'counties'} represented)*`);
        sections.push('');
        countyBreakdown.forEach(({ county, count }) => sections.push(`- **${county}:** ${count} ${count === 1 ? 'respondent' : 'respondents'}`));
        sections.push('');
    }

    const dataSummary = sections.join('\n');

    const systemPrompt = `You are a senior public finance accountability analyst specialising in African youth funds and devolved government spending. You produce rigorous, evidence-based accountability briefs. You write with authority and precision, citing specific data. You never produce vague or generic output.`;

    const prompt = `You have just received citizen-submitted accountability data about a youth fund on the Kiongozi civic platform, a platform empowering African youth to investigate whether public funds promised to them actually reach beneficiaries.

${dataSummary}

---

Produce a structured markdown report using EXACTLY this format. Be specific, cite the data, and write like a professional accountability analyst, not a chatbot summarising bullet points.

---

## Executive Summary
*2 to 3 punchy sentences. What is the single most important accountability concern a policymaker or oversight body should know? Be bold and direct.*

---

## Application Experience Findings
Synthesise Q1 responses: what is the real, lived experience of applying for this fund? Cite specific difficulties mentioned.

---

## Is the Fund Reaching Those Who Need It Most?
Synthesise Q2 responses: what does the community believe about targeting and reach? State clearly whether sentiment is positive, mixed, or negative, and why.

---

## Transparency Gaps
Synthesise Q3 responses: what specific information do citizens want government agencies to publish? List concrete disclosure requests.

---

## Recurring Accountability Concerns

Cluster Q4 responses (delays, irregularities, unfair practices) into named recurring concerns. For each: a short label, how many responses raised it, and a representative paraphrase. If there are too few Q4 responses to identify a pattern, say so explicitly.

---

## Regional Patterns

If a "Regional Distribution" section appears above with 2 or more counties, note whether concerns or experiences differ meaningfully by county, name the counties explicitly. If only one county (or zero) is represented, write: *"Insufficient regional data, responses came from too few distinct counties to compare."* and stop this section there.

---

## Inclusion & Equity (Q5)

Synthesise Q5 responses on accessibility for women, persons with disabilities, and vulnerable youth. What specific improvements were suggested?

---

## Recommendations for Government Agencies

Give 3 to 4 specific, actionable recommendations to improve transparency and fund delivery. Label each by urgency:

**[Quick Win | Medium-term | Structural Reform]**, *Title*
One or two sentences: what specifically should be done, and why the data justifies it.

---

*Report generated by Kiongozi AI Accountability Analyst · ${responses.length} responses analysed · ${fund.sector ?? 'General'} sector*

---

IMPORTANT GUIDELINES:
- Write in English. Be direct and analytical, not generic.
- Cite actual numbers and quote fragments from the data wherever possible.
- Acknowledge limitations if sample size is small (under 10 responses).
- If the data shows serious irregularities, say so explicitly, don't soften it.
- Keep the entire report between 600 to 900 words of prose (excluding headers/labels).
- Do NOT add commentary outside the template structure above.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        console.error("Missing ANTHROPIC_API_KEY");
        return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    try {
        const insights = await callAnthropicMessage({
            apiKey,
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 1800,
            temperature: 0.5,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }],
            errorLabel: 'Anthropic API fund analysis failure:',
        });

        await supabase.from('fund_briefs').insert({
            fund_id: fundId,
            title: `Accountability Brief: ${fund.title} (${new Date().toLocaleDateString()})`,
            content: insights,
            generated_by: user.id,
            status: 'draft'
        });

        return NextResponse.json({ insights });
    } catch (err: any) {
        console.error("Fund AI Analysis error:", err.message);
        return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }
}

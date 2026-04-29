import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/app/utils/supabase/server';

export async function POST(req: NextRequest, { params }: { params: Promise<{ pollId: string }> }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { pollId } = await params;

    const { data: poll } = await supabase.from('policy_polls').select('*').eq('id', pollId).single();
    if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 });

    const { data: questions } = await supabase
        .from('poll_questions')
        .select('*, poll_options(*)')
        .eq('poll_id', pollId)
        .order('question_order');

    const { data: responses } = await supabase
        .from('poll_responses')
        .select('*')
        .eq('poll_id', pollId);

    if (!questions || !responses) {
        return NextResponse.json({ error: 'No data' }, { status: 400 });
    }

    // Build a human-readable summary of results for the AI
    const summaryLines: string[] = [
        `Poll: "${poll.title}"`,
        `Category: ${poll.category}`,
        `Description: ${poll.description ?? 'N/A'}`,
        `Total Respondents: ${poll.response_count}`,
        '',
        'Results by Question:',
    ];

    for (const q of questions) {
        summaryLines.push(`\nQ: ${q.question_text} (type: ${q.question_type})`);
        const qResponses = responses.filter(r => r.question_id === q.id);

        if (q.question_type === 'single_choice' || q.question_type === 'multiple_choice') {
            const opts = (q.poll_options ?? []).sort((a: any, b: any) => a.option_order - b.option_order);
            const total = opts.reduce((sum: number, o: any) => sum + o.vote_count, 0);
            for (const opt of opts) {
                const pct = total > 0 ? ((opt.vote_count / total) * 100).toFixed(1) : '0.0';
                summaryLines.push(`  - "${opt.option_text}": ${opt.vote_count} votes (${pct}%)`);
            }
        } else if (q.question_type === 'scale') {
            const values = qResponses.map(r => r.scale_value).filter(Boolean);
            const avg = values.length > 0 ? (values.reduce((a: number, b: number) => a + b, 0) / values.length).toFixed(2) : 'N/A';
            summaryLines.push(`  Average rating: ${avg}/10 from ${values.length} responses`);
        } else if (q.question_type === 'text') {
            const texts = qResponses.map(r => r.text_response).filter(Boolean).slice(0, 10);
            summaryLines.push('  Sample responses:');
            texts.forEach(t => summaryLines.push(`    - "${t}"`));
        }
    }

    const prompt = `You are a youth policy analyst. Analyze the following survey results from a youth policy poll and generate a clear, actionable insights report for policymakers.

${summaryLines.join('\n')}

Write a structured insights report with:
1. Key Findings (3-4 bullet points)
2. Youth Sentiment Analysis (2-3 sentences)
3. Policy Recommendations (3 actionable recommendations)
4. Areas Needing More Research

Keep the tone professional, evidence-based, and focused on youth needs. Be concise (300-400 words).`;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 });

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 600,
            temperature: 0.6,
        }),
    });

    if (!aiRes.ok) {
        const err = await aiRes.text();
        console.error('OpenAI error:', err);
        return NextResponse.json({ error: 'AI analysis failed' }, { status: 500 });
    }

    const aiData = await aiRes.json();
    const insights = aiData.choices?.[0]?.message?.content ?? '';

    // Cache insights on the poll
    await supabase.from('policy_polls').update({
        ai_insights: insights,
        insights_generated_at: new Date().toISOString(),
    }).eq('id', pollId);

    return NextResponse.json({ insights });
}

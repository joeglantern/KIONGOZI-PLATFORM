import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, tooManyRequests } from '@/lib/rate-limit';
import { requireUser } from '@/lib/auth/guard';
import { callAnthropicMessage } from '@/lib/ai/anthropic';

const MAX_TEXT_LENGTH = 5000;

export async function POST(req: NextRequest) {
    try {
        // Require auth — the endpoint spends money on every call.
        const gate = await requireUser();
        if (!gate.ok) return NextResponse.json({ error: gate.error }, { status: gate.status });
        const { user } = gate;

        const limit = rateLimit(`translate:${user.id}`, 30, 60 * 1000);
        if (!limit.success) return tooManyRequests(limit);

        const { text, targetLanguage } = await req.json();

        if (!text || !text.trim()) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }
        if (typeof text !== 'string' || text.length > MAX_TEXT_LENGTH) {
            return NextResponse.json({ error: 'Text too long' }, { status: 413 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error("Missing ANTHROPIC_API_KEY env variable");
            return NextResponse.json({ error: 'Translation service not configured' }, { status: 500 });
        }

        const systemPrompt = `You are an expert translator specializing in African languages, local dialects, and slang (including Kenyan Sheng, Kiswahili, etc.). 
Translate the user's text to ${targetLanguage || 'English'}. 
Preserve the youth advocate tone, meaning, and emotional urgency. Do not include any introductory remarks, explanations, or metadata. Output ONLY the translated text.`;

        const translatedText = (await callAnthropicMessage({
            apiKey,
            model: 'claude-3-haiku-20240307',
            maxTokens: 1000,
            temperature: 0.2,
            system: systemPrompt,
            messages: [{ role: 'user', content: text }],
            errorLabel: 'Anthropic API translation failure:',
        })).trim();

        return NextResponse.json({ translatedText });
    } catch (err: any) {
        console.error("Translation API error:", err.message);
        return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }
}

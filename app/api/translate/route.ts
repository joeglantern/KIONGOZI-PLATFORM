import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { text, targetLanguage } = await req.json();

        if (!text || !text.trim()) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error("Missing ANTHROPIC_API_KEY env variable");
            return NextResponse.json({ error: 'Translation service not configured' }, { status: 500 });
        }

        const systemPrompt = `You are an expert translator specializing in African languages, local dialects, and slang (including Kenyan Sheng, Kiswahili, etc.). 
Translate the user's text to ${targetLanguage || 'English'}. 
Preserve the youth advocate tone, meaning, and emotional urgency. Do not include any introductory remarks, explanations, or metadata. Output ONLY the translated text.`;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1000,
                temperature: 0.2,
                system: systemPrompt,
                messages: [
                    { role: 'user', content: text }
                ]
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error("Anthropic API translation failure:", errBody);
            throw new Error(`Anthropic HTTP error: ${response.status}`);
        }

        const data = await response.json();
        const translatedText = data.content?.[0]?.text?.trim() ?? '';

        return NextResponse.json({ translatedText });
    } catch (err: any) {
        console.error("Translation API error:", err.message);
        return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
    }
}

interface AnthropicMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface CallAnthropicParams {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    system: string;
    messages: AnthropicMessage[];
    /** Route-specific label logged with the raw error body on a non-OK response. */
    errorLabel: string;
}

/**
 * Call the Anthropic Messages API and return the first text block (or '').
 *
 * On a non-OK response it logs the raw error body under `errorLabel` and throws
 * `Anthropic HTTP error: <status>`, matching the previous per-route behaviour so
 * each caller's existing try/catch continues to work unchanged.
 */
export async function callAnthropicMessage({
    apiKey,
    model,
    maxTokens,
    temperature,
    system,
    messages,
    errorLabel,
}: CallAnthropicParams): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system,
            messages,
        }),
    });

    if (!response.ok) {
        const errBody = await response.text();
        console.error(errorLabel, errBody);
        throw new Error(`Anthropic HTTP error: ${response.status}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text ?? '';
}

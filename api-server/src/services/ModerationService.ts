import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const CATEGORY_LABELS: Record<string, string> = {
  hate: 'hate speech',
  'hate/threatening': 'threatening hate speech',
  harassment: 'harassment',
  'harassment/threatening': 'threatening harassment',
  'self-harm': 'self-harm content',
  'self-harm/intent': 'self-harm intent',
  'self-harm/instructions': 'self-harm instructions',
  sexual: 'sexual content',
  'sexual/minors': 'sexual content involving minors',
  violence: 'violent content',
  'violence/graphic': 'graphic violence',
};

export interface ModerationResult {
  flagged: boolean;
  reason?: string;
}

/**
 * Checks text against OpenAI's free moderation endpoint.
 * Fails open — if the API is unreachable, the post is allowed through
 * so a third-party outage never blocks legitimate users.
 */
async function checkText(text: string): Promise<ModerationResult> {
  if (!process.env.OPENAI_API_KEY || !text.trim()) {
    return { flagged: false };
  }

  try {
    const response = await openai.moderations.create({ input: text });
    const result = response.results[0];

    if (!result.flagged) return { flagged: false };

    // Find the highest-scoring flagged category for a clear error message
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([key]) => CATEGORY_LABELS[key] || key);

    const reason = flaggedCategories.length > 0
      ? `Your post was flagged for ${flaggedCategories.join(', ')}. Please review our community guidelines.`
      : 'Your post was flagged by our content moderation system. Please review our community guidelines.';

    return { flagged: true, reason };
  } catch (err) {
    // Fail open — log but do not block the post
    console.error('ModerationService error (failing open):', err);
    return { flagged: false };
  }
}

export default { checkText };

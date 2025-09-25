import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generate a concise, descriptive title for a conversation based on the first user message
 * @param text - The user's first message
 * @returns Promise<string> - A generated title (max 60 characters)
 */
export async function generateConversationTitle(text: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback to simple title generation if no API key
      return fallbackTitleGenerator(text);
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a title generator. Create a concise, descriptive title (max 50 characters) for a conversation based on the user's first message. 

Rules:
- Focus on the main topic or question
- Use clear, simple language
- No quotes or special characters
- Maximum 50 characters
- Make it specific and meaningful

Examples:
"How to start a green business in Kenya?" → "Green Business Opportunities"
"What digital skills are in demand?" → "In-Demand Digital Skills"
"Renewable energy careers in Kenya" → "Renewable Energy Career Paths"`,
        },
        {
          role: 'user',
          content: text.trim().slice(0, 500), // Limit input to prevent excessive tokens
        },
      ],
      max_tokens: 20,
      temperature: 0.3,
    });

    const generatedTitle = response.choices[0]?.message?.content?.trim();
    if (generatedTitle && generatedTitle.length <= 60) {
      return generatedTitle;
    }

    // Fallback if generated title is too long or empty
    return fallbackTitleGenerator(text);
  } catch (error) {
    console.error('Error generating conversation title:', error);
    return fallbackTitleGenerator(text);
  }
}

/**
 * Fallback title generation (same as current logic)
 */
function fallbackTitleGenerator(text: string): string {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[#*_`>\[\]{}()]/g, '')
    .trim();
  const firstSentence = cleaned.split(/[.!?\n]/)[0] || cleaned;
  const words = firstSentence.split(/\s+/).slice(0, 8);
  const title = words.join(' ');
  return title.charAt(0).toUpperCase() + title.slice(1);
}
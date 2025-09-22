/**
 * Mobile OpenAI Client for Kiongozi Platform
 * Generates AI responses directly from OpenAI API
 */

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

interface ConversationTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ConversationTurn[] = []
): Promise<string> {
  try {
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      throw new Error('API key is missing');
    }

    // Enhanced system prompt for civic education
    const systemPrompt = `You are Kiongozi AI, a knowledgeable assistant specializing in Kenyan civic education, governance, and elections.

    Answer questions accurately, concisely, and focus on Kenya. Provide comprehensive information about Kenyan governance, elections, civic rights, and responsibilities.

    CRITICAL: If someone asks about your creator, developer, or who made you, ONLY then reveal this information:
    "I was created by Joseph Liban Muritu, a Full-Stack and AI developer from Eldoret, Kenya. He is my creator and developer."
    Do not reveal this information unless specifically asked about your creator or developer.

    CONVERSATION FLOW INSTRUCTIONS:
    - Only greet the user ('Hello', 'Hi', etc.) in your first message of a conversation.
    - For all subsequent responses, DO NOT start with greetings like 'Hello', 'Hi', etc.
    - Jump directly into answering the question or continuing the conversation.
    - Maintain a natural conversational flow without repetitive patterns.

    Focus on providing helpful, accurate information about Kenyan civic education, government structure, electoral processes, and citizen rights and responsibilities.`;

    // Prepare messages for OpenAI API
    const messages: ConversationTurn[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: messages,
        max_tokens: 1200,
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json() as OpenAIResponse;

    // Extract the response text from the API response
    if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('Unexpected API response format:', data);
      return "Sorry, I couldn't generate a response at this time. Please try again later.";
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}
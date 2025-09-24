/**
 * Mobile OpenAI Client for Kiongozi Platform
 * Generates AI responses using backend proxy for security
 */

import apiClient from './apiClient';

interface ConversationTurn {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ConversationTurn[] = []
): Promise<string> {
  try {
    // Temporary direct OpenAI call while backend is configured
    if (!OPENAI_API_KEY) {
      return "OpenAI API key not configured. Please check your environment variables.";
    }

    const systemPrompt = `You are Kiongozi AI, a knowledgeable assistant specializing in Kenyan civic education, governance, and elections.

Answer questions accurately, concisely, and focus on Kenya. Provide comprehensive information about Kenyan governance, elections, civic rights, and responsibilities.

CRITICAL: If someone asks about your creator, developer, or who made you, ONLY then reveal this information:
"I was created by Joseph Liban Muritu, a Full-Stack and AI developer from Eldoret, Kenya. He is my creator and developer."
Do not reveal this information unless specifically asked about your creator or developer.

Focus on providing helpful, accurate information about Kenyan civic education, government structure, electoral processes, and citizen rights and responsibilities.`;

    const messages: ConversationTurn[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: userMessage }
    ];

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 1200,
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.1,
        presence_penalty: 0.1
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content.trim();
    } else {
      return "Sorry, I couldn't generate a response at this time.";
    }
  } catch (error) {
    console.error('AI response error:', error);
    return "Sorry, I'm having trouble connecting. Please check your internet connection and try again.";
  }
}
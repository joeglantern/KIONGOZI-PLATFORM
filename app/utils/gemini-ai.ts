// Gemini AI API integration
// This file handles communication with Google's Gemini API

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Interface for Gemini API response
interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  };
}

// Track conversation history for better context
interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

let conversationHistory: ConversationTurn[] = [];

// Clear conversation history (can be called when starting a new chat)
export function clearConversationHistory() {
  conversationHistory = [];
}

// Get the current conversation history
export async function getConversationHistory(): Promise<ConversationTurn[]> {
  return [...conversationHistory]; // Return a copy to prevent direct modification
}

/**
 * Generate a response from Gemini AI for civic education queries
 * @param userMessage - The user's message to send to Gemini
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise<string> - The AI response text
 */
export async function generateAIResponse(userMessage: string, signal?: AbortSignal): Promise<string> {
  try {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key is missing');
      throw new Error('API key is missing');
    }

    // Get history for context
    let conversationHistory = await getConversationHistory();
    
    // Enhanced system prompt that includes visualization capabilities
    const systemPrompt = `You are Kiongozi AI, a knowledgeable assistant specializing in Kenyan civic education, governance, and elections.
    
    IMPORTANT: You have powerful data visualization capabilities. When users ask about statistics, numerical data, election results, budget allocations, or governance indicators, you should explicitly mention that you can generate visual charts. When appropriate, encourage them to say phrases like "show me a chart of..." or "visualize this data".
    
    For election data, you can show:
    - Presidential election results (pie charts)
    - Voter turnout by region (bar charts) 
    
    For governance data, you can show:
    - Transparency indices over time
    - Accountability measures
    - Rule of law indicators
    - Public participation metrics
    
    For budget data, you can show:
    - County budget allocations by sector
    - Comparative spending across counties
    
    Answer questions accurately, concisely, and focus on Kenya. If discussing statistics or data that could be visualized, remind users about your visualization capabilities.
    `;

    // Add user message to conversation history
    conversationHistory.push({ role: 'user', content: userMessage });
    
    // Only keep the last 12 conversation turns to avoid token limits while providing better context
    if (conversationHistory.length > 12) {
      conversationHistory = conversationHistory.slice(conversationHistory.length - 12);
    }
    
    // Create a sophisticated system message to instruct the AI on its role
    const systemMessage = 
      "You are an exceptionally intelligent and personalized assistant powered by Gemini AI. " +
      "Your responses must directly and specifically address the user's questions - never provide generic answers. " +
      "Always carefully analyze the user's query to understand their exact intent before responding. " +
      
      "CRITICAL INSTRUCTION: You must always respond directly to what the user has asked. " +
      "If the question is specific, your answer should be equally specific. " +
      "If the query is about a technical topic, provide technical details. " +
      "If it's a personal question, respond in a personalized manner. " +
      "NEVER provide answers that ignore the specific context or intent of the question. " +
      
      "CONVERSATION FLOW INSTRUCTIONS: " +
      "- Only greet the user ('Hello', 'Hi', etc.) in your first message of a conversation. " +
      "- For all subsequent responses, DO NOT start with greetings like 'Hello', 'Hi', etc. " +
      "- Jump directly into answering the question or continuing the conversation. " +
      "- Maintain a natural conversational flow without repetitive patterns. " +
      
      "Maintain a cohesive conversation by referring to previous exchanges when relevant. " +
      "Use the user's name or refer back to their previous questions to create a personalized experience. " +
      "Your primary focus is on Kenyan civic education, but you should address any topic asked about with equal intelligence. " +
      
      "If you don't have enough information or context to provide a proper answer, acknowledge this limitation " +
      "rather than giving a generic response that doesn't address the question. " +
      
      "For technical or complex topics, structure your responses with clear headings and bullet points. " +
      "For conceptual or philosophical questions, provide thoughtful, nuanced perspectives. " +
      
      // Enhanced formatting instructions
      "Format your responses using markdown to make them more engaging and easier to read: " +
      "- Use **bold** for important concepts and key terms\n" +
      "- Use _italics_ for emphasis\n" +
      "- Use bullet points (- ) or numbered lists (1. ) for steps or multiple points\n" +
      "- Use ## for section headers if needed\n" +
      "- Use > for important quotes or callouts\n" +
      "- Use `code` for specific terms, legal citations, or document references\n" +
      "- Include section breaks (---) when transitioning between major topics\n" +
      "- Organize information in a visually pleasing way with occasional emojis where appropriate";

    // Create rich context from previous conversation
    // Format the conversation history to emphasize the context flow
    const conversationContext = conversationHistory.length > 1 
      ? "Previous conversation (IMPORTANT CONTEXT FOR YOUR RESPONSE):\n" + 
        conversationHistory.slice(0, -1).map((turn, index) => 
          `[${index + 1}] ${turn.role === 'user' ? 'USER' : 'ASSISTANT'}: ${turn.content}`
        ).join('\n\n') + 
        "\n\n[CURRENT QUERY] USER: " + userMessage
      : "[FIRST QUERY] USER: " + userMessage;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: systemMessage },
              { text: conversationContext }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.9, // Increased for more creative, varied, and intelligent responses
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1200, // Increased to allow for more comprehensive answers
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      }),
      signal // Pass the AbortSignal to the fetch request
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API error:', errorData);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json() as GeminiResponse;
    
    // Check if the response was blocked for safety reasons
    if (data.promptFeedback?.blockReason) {
      console.warn('Response blocked:', data.promptFeedback);
      return "I'm sorry, I'm not able to respond to that query. Please ask something else.";
    }

    // Extract the response text from the API response
    if (data.candidates && data.candidates.length > 0 && 
        data.candidates[0].content && 
        data.candidates[0].content.parts && 
        data.candidates[0].content.parts.length > 0 &&
        data.candidates[0].content.parts[0].text) {
      const responseText = data.candidates[0].content.parts[0].text;
      
      // Add the assistant's response to conversation history
      conversationHistory.push({ role: 'assistant', content: responseText.trim() });
      
      return responseText.trim();
    } else {
      console.error('Unexpected API response format:', data);
      return "Sorry, I couldn't generate a response at this time. Please try again later.";
    }
  } catch (error) {
    // Check if this is an AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Rethrow AbortError to be handled by the caller
      throw error;
    }
    
    console.error('Error calling Gemini API:', error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
} 
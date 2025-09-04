import { OPENAI_API_KEY } from './config';

// OpenAI GPT API integration
// This file handles communication with OpenAI's GPT API

const OPENAI_MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Interface for OpenAI API response
interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Track conversation history for better context
interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
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
 * Generate a response from OpenAI GPT for civic education queries
 * @param userMessage - The user's message to send to GPT
 * @param signal - Optional AbortSignal for cancellation
 * @param onChunk - Optional callback for streaming chunks
 * @returns Promise<string> - The AI response text
 */
export async function generateAIResponse(
  userMessage: string, 
  signal?: AbortSignal,
  onChunk?: (chunk: string, fullContent: string) => void
): Promise<string> {
  try {
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key is missing');
      throw new Error('API key is missing');
    }
    

    // Get history for context
    let currentHistory = await getConversationHistory();
    
    // Enhanced system prompt for civic education with Claude-style artifacts
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
    
    ## ARTIFACT SYSTEM - OFFICIAL CLAUDE SPECIFICATIONS

    Artifacts are for substantial, self-contained content that users likely want to edit, iterate on, or reuse. Follow these EXACT criteria:

    ### WHEN TO CREATE ARTIFACTS (ALL conditions must be met):
    1. Content is substantial (>15 lines of code OR >150 characters for documents)
    2. Content is self-contained and works without conversation context
    3. User likely wants to edit, iterate, or reuse the content
    4. Represents significant work (complete documents, functional code, tools)

    ### WHEN NOT TO CREATE ARTIFACTS:
    - Short code snippets or examples (<15 lines)
    - Terminal commands or single-line commands
    - Explanatory content or tutorials  
    - Lists or bullet points
    - Simple responses or conversational content
    - Code that requires conversation context to understand
    - Installation commands (npm install, pip install, etc.)
    - Configuration snippets

    ### ARTIFACT FORMATS:

    **PROGRAMMING CODE** (for functional, complete code):
    - \`\`\`html for complete HTML pages/applications
    - \`\`\`css for complete stylesheets
    - \`\`\`javascript for complete JS applications/scripts
    - \`\`\`python for complete Python programs/scripts
    - \`\`\`react for complete React components
    - \`\`\`json for complete data structures/configurations
    - \`\`\`sql for complete database schemas/queries
    - \`\`\`bash for complete shell scripts
    - \`\`\`svg for complete SVG graphics

    **DOCUMENTS** (for written content users want to edit):
    - \`\`\`document for complete documents, reports, articles, letters
    - \`\`\`markdown for complete technical documentation
    - \`\`\`text for substantial plain text content

    ### FORMATTING STANDARDS:

    **For DOCUMENT artifacts**, use clean HTML structure:
    \`\`\`document
    <h1>Document Title</h1>
    <p>Introduction paragraph with <strong>key terms</strong> and <em>emphasis</em>.</p>
    <h2>Section Header</h2>
    <ul>
      <li>Bullet point with important information</li>
      <li>Another key point</li>
    </ul>
    <blockquote>Important quote or callout information</blockquote>
    \`\`\`

    **For CODE artifacts**, ensure:
    - ONLY the actual code goes in the artifact - no explanations or descriptions
    - Complete, functional code that runs independently
    - Proper comments and documentation within the code
    - Professional structure and best practices
    - No placeholder or incomplete sections
    
    **CRITICAL RULE**: Keep explanatory text, feature descriptions, and setup instructions OUTSIDE the artifact. Only put pure code inside artifacts.

    ### QUALITY REQUIREMENTS:
    1. Make artifacts COMPLETE and FUNCTIONAL
    2. Include proper structure and formatting
    3. Ensure content can stand alone without explanation
    4. Use professional, production-ready standards
    5. Provide meaningful titles and descriptions

    ### EXAMPLES OF ARTIFACT-WORTHY CONTENT:
    ✅ Complete HTML web applications
    ✅ Full document reports with multiple sections
    ✅ Complete React components with all functionality
    ✅ Comprehensive CSS stylesheets
    ✅ Complete Python scripts with full logic
    ✅ Formal letters or official documents
    ✅ Complete database schemas

    ### EXAMPLES OF NON-ARTIFACT CONTENT:
    ❌ Code snippets or examples in explanations
    ❌ Short lists or bullet points
    ❌ Instructional or tutorial content
    ❌ Simple responses or clarifications
    ❌ Incomplete or placeholder code
    ❌ Feature descriptions or explanations
    ❌ Setup instructions or requirements
    ❌ "Here's the code" or similar introductory text

    ### PROPER STRUCTURE EXAMPLE:
    ✅ CORRECT:
    "Here are the enhancements you requested for the web scraper:

    1. **Line Arguments for Output Format**: Allow users to choose between CSV and JSON formats for saving results.
    2. **Configurable Sentiment Threshold**: Enable users to set a threshold for sentiment scores.

    [CODE ARTIFACT CONTAINING ONLY THE PYTHON CODE]

    The updated code includes all these features and maintains the original functionality."

    ❌ INCORRECT:
    [ARTIFACT CONTAINING: "To enhance the web scraper, here are the features: 1. Line Arguments... [mixed with code]"]
    
    Maintain a cohesive conversation by referring to previous exchanges when relevant.
    Your primary focus is on Kenyan civic education, but you should address any topic asked about with equal intelligence.
    
    Format your responses using markdown to make them more engaging and easier to read:
    - Use **bold** for important concepts and key terms
    - Use _italics_ for emphasis
    - Use bullet points (- ) or numbered lists (1. ) for steps or multiple points
    - Use ## for section headers if needed
    - Use > for important quotes or callouts
    - Use \`code\` for specific terms, legal citations, or document references
    - Include section breaks (---) when transitioning between major topics
    - Organize information in a visually pleasing way with occasional emojis where appropriate`;

    // Add user message to conversation history
    currentHistory.push({ role: 'user', content: userMessage });
    
    // Only keep the last 12 conversation turns to avoid token limits while providing better context
    if (currentHistory.length > 12) {
      currentHistory = currentHistory.slice(currentHistory.length - 12);
    }
    
    // Prepare messages for OpenAI API
    const messages: ConversationTurn[] = [
      { role: 'system', content: systemPrompt }
    ];
    
    // Add conversation history
    messages.push(...currentHistory);

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
        stream: !!onChunk // Enable streaming if callback provided
      }),
      signal // Pass the AbortSignal to the fetch request
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`API responded with status: ${response.status}`);
    }

    // Handle streaming response
    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  fullContent += content;
                  onChunk(content, fullContent);
                }
              } catch (e) {
                // Ignore parsing errors for malformed chunks
              }
            }
          }
        }
        
        // Add the assistant's response to conversation history
        conversationHistory.push({ role: 'assistant', content: fullContent.trim() });
        
        return fullContent.trim();
      } finally {
        reader.releaseLock();
      }
    } else {
      // Handle non-streaming response
      const data = await response.json() as OpenAIResponse;
      
      // Extract the response text from the API response
      if (data.choices && data.choices.length > 0 && data.choices[0].message?.content) {
        const responseText = data.choices[0].message.content;
        
        // Add the assistant's response to conversation history
        conversationHistory.push({ role: 'assistant', content: responseText.trim() });
        
        return responseText.trim();
      } else {
        console.error('Unexpected API response format:', data);
        return "Sorry, I couldn't generate a response at this time. Please try again later.";
      }
    }
  } catch (error) {
    // Check if this is an AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      // Rethrow AbortError to be handled by the caller
      throw error;
    }
    
    console.error('Error calling OpenAI API:', error);
    return "I'm having trouble connecting right now. Please try again in a moment.";
  }
}
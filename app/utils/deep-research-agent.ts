// Deep Research Agent API integration
// This file enhances the OpenAI GPT with deep research capabilities

import apiClient from './apiClient';

// Helper function to use backend API with abort signal support
async function generateAIResponse(prompt: string, signal?: AbortSignal, conversationId?: string): Promise<string> {
  if (signal?.aborted) {
    throw new DOMException("Operation aborted", "AbortError");
  }

  const response = await apiClient.generateAIResponse(prompt, conversationId, 'research');

  if (signal?.aborted) {
    throw new DOMException("Operation aborted", "AbortError");
  }

  if (!response.success) {
    throw new Error(response.error || 'Failed to generate AI response');
  }

  return (response.data as any)?.response || '';
}

// Interface for research response
export interface ResearchResponse {
  summary: string;
  keyPoints: string[];
  sources?: {
    title: string;
    url: string;
    snippet: string;
  }[];
  relatedTopics?: string[];
}

/**
 * Processes user query to generate a deep research response
 * Uses multiple calls to the AI to create comprehensive answers
 * @param query - The user's research query
 * @param signal - Optional AbortSignal for cancellation
 * @returns Promise<ResearchResponse> - A structured research response
 */
export async function generateResearchResponse(query: string, signal?: AbortSignal): Promise<ResearchResponse> {
  const startTime = Date.now();

  try {
    // Enhanced system instructions for civic education research
    const systemInstruction = `You are a Kenyan civic education research agent that provides in-depth, factual information about Kenyan governance, elections, and civic participation.
    
    Your goal is to provide comprehensive, factually accurate information about Kenyan civic education topics.`;

    // Process the query to identify key aspects that need addressing
    const queryAnalysisPrompt = `ANALYZE THIS QUERY: "${query}"

Before generating a response, analyze this query to identify:
1. The core question or topic being asked about
2. Any specific aspects or angles the user wants addressed
3. The level of detail likely expected in the response
4. Whether this requires factual information, analysis, or opinion

Return a concise analysis that will help me understand exactly what the user is seeking.`;

    // First get a query analysis to better understand what the user is asking
    const queryAnalysis = await generateAIResponse(queryAnalysisPrompt, signal);
    
    // Check if the operation was aborted
    if (signal?.aborted) {
      throw new DOMException("Research operation aborted", "AbortError");
    }
    
    // Check if we got a valid response
    if (!queryAnalysis || typeof queryAnalysis !== 'string' || queryAnalysis.trim() === '') {
      throw new Error("Failed to get a valid query analysis response");
    }
    
    // Now create a main research prompt that incorporates the query analysis
    const mainPrompt = `DEEP RESEARCH MODE: ${query}

QUERY ANALYSIS: ${queryAnalysis}

Based on the above analysis, provide a comprehensive, highly intelligent response that DIRECTLY addresses what the user is asking. This is critical - your response must be specifically tailored to answer the exact question posed.

Your response should:
1. Focus on delivering precisely what the user is seeking
2. Include depth and nuance appropriate to the complexity of the question
3. Provide factual information where requested, and thoughtful analysis where appropriate
4. Avoid generic information that doesn't directly relate to the query

IMPORTANT STYLE GUIDELINES:
- DO NOT start your response with greetings like "Hello", "Hi", etc.
- Begin directly with answering the question or providing the requested information
- Avoid generic introductory sentences like "Here's information about..."
- Use a professional, authoritative tone throughout

Aim for an authoritative, scholarly but accessible tone. Format your response using markdown:
- Use **bold** for key terms and important concepts
- Use _italics_ for emphasis
- Use bullet points or numbered lists for multiple items
- Use ## and ### for section headers
- Use > for important quotes or callouts
- Use \`code\` for specific terms, legal citations, or document references
- Include section breaks (---) where appropriate
- Use emoji sparingly to emphasize important points`;

    const mainResponse = await generateAIResponse(mainPrompt, signal);
    
    // Check if the operation was aborted
    if (signal?.aborted) {
      throw new DOMException("Research operation aborted", "AbortError");
    }
    
    // Check if we got a valid response
    if (!mainResponse || typeof mainResponse !== 'string' || mainResponse.trim() === '') {
      throw new Error("Failed to get a valid main research response");
    }
    
    // Then, get key points that specifically address the user's query
    const keyPointsPrompt = `Based on this query: "${query}"

Identify the 4-6 most crucial points that directly answer what the user is asking. These should be the core insights that specifically address their question.

Create concise, insightful key points that:
- Directly respond to the most important aspects of the query
- Provide the most valuable insights relating to their specific question
- Are arranged in a logical order that builds understanding
- Together form a complete answer to their question

DO NOT include any introductory text or greeting before the points.
Format each point with a descriptive bold heading followed by 1-2 sentences of explanation.`;

    const keyPointsResponse = await generateAIResponse(keyPointsPrompt, signal);
    
    // Check if the operation was aborted
    if (signal?.aborted) {
      throw new DOMException("Research operation aborted", "AbortError");
    }
    
    // Check if we got a valid response
    let keyPointsText = keyPointsResponse;
    if (!keyPointsText || typeof keyPointsText !== 'string') {
      keyPointsText = "Failed to generate key points for this research.";
    }
    
    // Extract key points from the response
    let keyPoints = keyPointsText
      .split(/\n+/)
      .filter(point => point.trim().length > 0 && (point.startsWith('-') || point.match(/^\d+\./)))
      .map(point => point.replace(/^[-\d.]+\s*/, '').trim())
      .filter(point => point.length > 0)
      .slice(0, 6);
      
    // If no proper bullet points were found, try extracting paragraphs
    if (keyPoints.length === 0) {
      keyPoints = keyPointsText
        .split(/\n{2,}/)
        .filter(p => p.trim().length > 20)
        .slice(0, 6);
    }
    
    // Generate truly relevant related topics based on the query and main response
    const relatedTopicsPrompt = `Based on the query "${query}" and the research already provided, suggest 3-4 highly relevant follow-up topics.

These topics should:
1. Be natural extensions of the user's current inquiry
2. Represent what someone who asked this specific question would logically want to explore next
3. Provide valuable additional perspectives or information that builds on what they've already learned
4. Be specific and focused, not generic or obvious

DO NOT include any introductory text like "Here are some topics" or "You might be interested in".
Create these suggestions as compelling, specific topics that genuinely extend the user's knowledge journey. Each should begin with an appropriate emoji.`;

    const relatedTopicsResponse = await generateAIResponse(relatedTopicsPrompt, signal);
    
    // Check if the operation was aborted
    if (signal?.aborted) {
      throw new DOMException("Research operation aborted", "AbortError");
    }
    
    // Check if we got a valid response
    let relatedTopicsText = relatedTopicsResponse;
    if (!relatedTopicsText || typeof relatedTopicsText !== 'string') {
      relatedTopicsText = "Failed to generate related topics for this research.";
    }
    
    // Extract related topics
    let relatedTopics = relatedTopicsText
      .split(/\n+/)
      .filter(topic => topic.trim().length > 0 && (topic.startsWith('-') || topic.match(/^\d+\./) || topic.match(/^\p{Emoji}/u)))
      .map(topic => topic.replace(/^[-\d.]+\s*/, '').trim())
      .filter(topic => topic.length > 0)
      .slice(0, 4);
      
    // If no bullet points, extract paragraphs or sentences
    if (relatedTopics.length === 0) {
      relatedTopics = relatedTopicsText
        .split(/(?:\.\s+|\n{2,})/)
        .filter(s => s.trim().length > 10)
        .slice(0, 4);
    }
    
    // Ensure all related topics start with an emoji
    relatedTopics = relatedTopics.map(topic => {
      if (!topic.match(/^\p{Emoji}/u)) {
        const emojis = ['🔍', '📊', '🌐', '⚖️', '📚', '💡', '🧩', '🔄'];
        return `${emojis[Math.floor(Math.random() * emojis.length)]} ${topic}`;
      }
      return topic;
    });
    
    // Construct the structured research response
    return {
      summary: mainResponse,
      keyPoints: keyPoints.length > 0 ? keyPoints : [
        "**Direct Answer to Your Question**: The most important information addressing what you asked",
        "**Key Context and Background**: Essential context needed to understand the complete picture", 
        "**Important Implications**: What this means for the situation you're inquiring about",
        "**Practical Considerations**: How this information might be applied or understood in practice"
      ],
      relatedTopics: relatedTopics.length > 0 ? relatedTopics : [
        "🔍 Deeper Exploration of Specific Aspects in Your Query",
        "🌐 Broader Context and Related Frameworks",
        "⚖️ Alternative Perspectives on This Specific Topic",
        "💡 Practical Applications of These Insights"
      ]
    };
  } catch (error) {
    // Check if this is an AbortError and rethrow it to be handled by the caller
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    
    console.error('Error generating research response:', error);
    return {
      summary: "I'm having trouble conducting research on this topic right now. Please try again later.",
      keyPoints: ["Research capabilities may be temporarily limited", "Try asking a more specific question", "Basic information is still available in regular chat mode"]
    };
  }
}

/**
 * Format research response as a text string (for cases where UI components can't be used)
 * @param research - The research response object
 * @returns string - Formatted text version of the research
 */
export function formatResearchAsText(research: ResearchResponse): string {
  let result = research.summary + "\n\n";
  
  if (research.keyPoints && research.keyPoints.length > 0) {
    result += "## Key Points\n\n";
    research.keyPoints.forEach((point, i) => {
      result += `${i+1}. ${point}\n\n`;
    });
  }
  
  if (research.relatedTopics && research.relatedTopics.length > 0) {
    result += "## Related Topics to Explore\n\n";
    research.relatedTopics.forEach((topic) => {
      result += `- ${topic}\n`;
    });
  }
  
  return result;
} 
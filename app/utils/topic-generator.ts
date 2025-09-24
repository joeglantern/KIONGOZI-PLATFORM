// AI Topic Generator
// This file handles generation of AI-suggested topics for the sidebar and initial recommendations

import apiClient from './apiClient';

// Interface for topic category
export interface TopicCategory {
  id: string;
  title: string;
  emoji: string;
  color: string;
  questions: string[];
  selected?: boolean; // Add optional selection state for user preferences
}

/**
 * Generate AI-suggested topic categories for the sidebar
 * @param count Number of topics to generate (default: 10)
 * @returns Promise<TopicCategory[]> - Array of AI-generated topic categories
 */
export async function generateTopicCategories(count: number = 10): Promise<TopicCategory[]> {
  try {
    const prompt = `VERY IMPORTANT: Respond ONLY with a valid JSON array of ${count} topic categories for Kenyan civic education.

The response MUST:
1. Be VALID JSON that can be parsed with JSON.parse()
2. Start with '[' and end with ']' with NO text before or after
3. Include exactly ${count} objects with these properties:
   - "id": unique identifier string
   - "title": short topic title (3-4 words)
   - "emoji": single emoji related to the topic
   - "questions": array of exactly 4 questions about the topic

Example format:
[
  {
    "id": "voting-rights",
    "title": "Voting Rights",
    "emoji": "🗳️",
    "questions": [
      "How do I register to vote in Kenya?",
      "What ID do I need on election day?",
      "How are election results verified?",
      "What are my voting rights as a Kenyan?"
    ]
  },
  {
    "id": "devolution",
    "title": "County Governance",
    "emoji": "🏛️",
    "questions": [
      "How does devolution work in Kenya?",
      "What services do county governments provide?",
      "How are county funds allocated?",
      "How can citizens engage with county governments?"
    ]
  }
]

IMPORTANT: Your response must be ONLY the JSON array - no explanations, no comments, no code blocks.`;

    try {
      // First, try to get a proper JSON response
      let response = '';
      try {
        const apiResponse = await apiClient.generateAIResponse(prompt, undefined, 'chat');
        if (!apiResponse.success) {
          throw new Error(apiResponse.error || 'Failed to generate topics');
        }
        response = (apiResponse.data as any)?.response || '';
      } catch (aiError) {
        console.error('Error generating topic response:', aiError);
        // If the AI fails, return fallback topics
        return getFallbackTopics().slice(0, count);
      }
      
      // If we get a failed response or an empty one, return fallback topics
      if (!response || typeof response !== 'string' || response.trim() === '') {
        console.log('Empty or invalid response from AI, using fallback topics');
        return getFallbackTopics().slice(0, count);
      }
      
      // Immediately check if the response looks like an error message
      if (response.includes("I'm having trouble") || 
          response.includes("I'm sorry") || 
          response.includes("I apologize") ||
          !response.includes('[') || 
          !response.includes(']')) {
        console.log('Response appears to be an error message or not JSON, using fallback topics');
        return getFallbackTopics().slice(0, count);
      }
      
      // Detailed logging for debugging
      console.log('============ TOPIC GENERATION RESPONSE ============');
      console.log('Response length:', response.length);
      console.log('First 50 chars:', response.substring(0, 50));
      console.log('Last 50 chars:', response.substring(Math.max(0, response.length - 50)));
      console.log('Contains "[": ', response.includes('['));
      console.log('Contains "]": ', response.includes(']'));
      console.log('==================================================');
      
      try {
        // Extract array from potential text wrapper
        const startIdx = response.indexOf('[');
        const endIdx = response.lastIndexOf(']');
        
        if (startIdx >= 0 && endIdx > startIdx) {
          const jsonStr = response.substring(startIdx, endIdx + 1);
          console.log('Extracted JSON array, length:', jsonStr.length);
        
          // Try parsing the extracted JSON
        try {
          const parsed = JSON.parse(jsonStr);
          
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Successfully parsed array
            const validatedCategories = parsed.map((category, index) => ({
              id: category.id || `category-${index + 1}`,
              title: category.title || `Category ${index + 1}`,
              emoji: category.emoji || '🔍',
              color: getColorForIndex(index),
              questions: Array.isArray(category.questions) && category.questions.length >= 2 
                ? category.questions 
                : ['What is this category about?', 'How does this affect citizens?', 'What are the key principles?', 'How can I learn more?'],
              selected: true
            }));
            
            return validatedCategories.slice(0, count);
          }
        } catch (parseError) {
            console.error('JSON parsing failed, using fallback topics:', parseError);
            return getFallbackTopics().slice(0, count);
          }
        }
      } catch (error) {
        console.error('Error processing topic response:', error);
      }
      
      // If we get here, we couldn't extract valid JSON
      console.log('Could not parse JSON from response, using fallback topics');
      return getFallbackTopics().slice(0, count);
    } catch (error) {
      console.error('Error in topic generation process:', error);
      return getFallbackTopics().slice(0, count);
    }
  } catch (error) {
    console.error('Critical error in topic generation:', error);
    return getFallbackTopics().slice(0, count);
  }
}

/**
 * Generate a color based on the index for consistent coloring
 */
function getColorForIndex(index: number): string {
  const colors = [
    "#4F46E5", // Indigo
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#EC4899", // Pink
    "#8B5CF6", // Violet
    "#06B6D4", // Cyan
    "#EF4444", // Red
    "#3B82F6", // Blue
    "#84CC16", // Lime
    "#6366F1", // Indigo-500
    "#F97316", // Orange
    "#14B8A6", // Teal
    "#D946EF", // Fuchsia
    "#64748B", // Slate
  ];
  
  return colors[index % colors.length];
}

/**
 * Filter topic categories based on user selection
 * @param topics All available topics
 * @param selectedIds IDs of selected topics, or null to select all
 * @returns Filtered topics with selected flag updated
 */
export function filterSelectedTopics(
  topics: TopicCategory[], 
  selectedIds: string[] | null = null
): TopicCategory[] {
  if (!selectedIds) {
    // If no selection provided, return all as selected
    return topics.map(t => ({ ...t, selected: true }));
  }
  
  return topics.map(topic => ({
    ...topic,
    selected: selectedIds.includes(topic.id)
  }));
}

/**
 * Fallback topics in case AI generation fails
 */
function getFallbackTopics(): TopicCategory[] {
  const fallbackTopics = [
    {
      id: "voting",
      title: "Voting & Elections",
      emoji: "🗳️",
      color: "#4F46E5",
      questions: [
        "How do I register to vote in Kenya?",
        "What ID do I need on election day?",
        "How are election results verified?",
        "What is the role of IEBC in elections?"
      ],
      selected: true
    },
    {
      id: "governance",
      title: "Governance Structure", 
      emoji: "🏛️",
      color: "#10B981",
      questions: [
        "What is devolution in Kenya?",
        "How does county government work?",
        "What are the roles of senators vs. governors?",
        "How many counties are in Kenya?"
      ],
      selected: true
    },
    {
      id: "rights",
      title: "Citizen Rights", 
      emoji: "⚖️",
      color: "#F59E0B",
      questions: [
        "What are my constitutional rights as a Kenyan?",
        "How can I participate in public participation?",
        "What is the role of the judiciary in protecting rights?",
        "How can I report corruption?"
      ],
      selected: true
    },
    {
      id: "education",
      title: "Civic Education", 
      emoji: "📚",
      color: "#EC4899",
      questions: [
        "What is the importance of civic education?",
        "How can I access civic education resources?",
        "What are Kenya's national values?",
        "What is the role of citizens in a democracy?"
      ],
      selected: true
    },
    {
      id: "legal",
      title: "Legal Framework", 
      emoji: "📜",
      color: "#8B5CF6",
      questions: [
        "How does Kenya's constitution work?",
        "What are the branches of government?",
        "How are laws passed in Kenya?",
        "What is the role of the Supreme Court?"
      ],
      selected: true
    },
    {
      id: "history",
      title: "Kenyan History", 
      emoji: "🏞️",
      color: "#06B6D4",
      questions: [
        "How did Kenya gain independence?",
        "What was the Mau Mau rebellion?",
        "How has Kenya's constitution evolved since independence?",
        "Who were Kenya's past presidents and their contributions?"
      ],
      selected: true
    },
    {
      id: "taxation",
      title: "Taxation & Finance", 
      emoji: "💰",
      color: "#EF4444",
      questions: [
        "How does tax collection work in Kenya?",
        "What are the different types of taxes in Kenya?",
        "How is the national budget created and allocated?",
        "What rights do citizens have regarding taxation?"
      ],
      selected: true
    },
    {
      id: "land-rights",
      title: "Land Rights", 
      emoji: "🏠",
      color: "#3B82F6",
      questions: [
        "How does land ownership work in Kenya?",
        "What are the procedures for buying land legally?",
        "How can I verify land ownership documents?",
        "What rights do communities have to ancestral lands?"
      ],
      selected: true
    },
    {
      id: "civic-duties",
      title: "Civic Duties", 
      emoji: "🤝",
      color: "#84CC16",
      questions: [
        "What are my responsibilities as a Kenyan citizen?",
        "How can I participate in community development?",
        "What is the importance of paying taxes?",
        "How can I report illegal activities in my community?"
      ],
      selected: true
    },
    {
      id: "human-rights",
      title: "Human Rights", 
      emoji: "✊",
      color: "#F97316",
      questions: [
        "What human rights are protected in Kenya?",
        "How can I report human rights violations?",
        "What is the role of the Kenya National Commission on Human Rights?",
        "How are minority rights protected in Kenya?"
      ],
      selected: true
    },
    // Additional backup topics if needed
    {
      id: "public-participation",
      title: "Public Participation", 
      emoji: "👥",
      color: "#14B8A6",
      questions: [
        "How can I participate in government decisions?",
        "What public participation forums exist in Kenya?",
        "Why is public participation important?",
        "How do I access public information in Kenya?"
      ],
      selected: true
    },
    {
      id: "electoral-process",
      title: "Electoral Process", 
      emoji: "📊",
      color: "#D946EF",
      questions: [
        "How are elections conducted in Kenya?",
        "What is the role of the IEBC?",
        "How are votes counted and verified?",
        "What electoral reforms have happened in Kenya?"
      ],
      selected: true
    },
    {
      id: "iebc-process",
      title: "IEBC Education", 
      emoji: "📋",
      color: "#8B5CF6",
      questions: [
        "What is the structure and mandate of the IEBC?",
        "How does the IEBC manage elections in Kenya?",
        "What is the role of IEBC in voter education?",
        "How does IEBC determine electoral boundaries?"
      ],
      selected: true
    },
    {
      id: "election-leadership",
      title: "Youth Leadership", 
      emoji: "👨‍👩‍👧‍👦",
      color: "#06B6D4",
      questions: [
        "How can youth participate in Kenya's electoral process?",
        "What leadership positions can young people vie for?",
        "What are the requirements for running for office in Kenya?",
        "What success stories exist of youth leaders in Kenya?"
      ],
      selected: true
    }
  ];

  // Ensure we always have enough fallback topics
  if (fallbackTopics.length < 10) {
    console.warn('WARNING: Not enough fallback topics defined. Topics might not display correctly.');
  }
  
  return fallbackTopics;
} 
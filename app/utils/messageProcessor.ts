export interface ProcessedMessage {
  content: string;
  hasCode: boolean;
  hasLinks: boolean;
  wordCount: number;
  codeBlocks: CodeBlock[];
}

export interface CodeBlock {
  language: string;
  code: string;
  lineCount: number;
}

/**
 * Process message content for enhanced display
 */
export function processMessageContent(text: string): ProcessedMessage {
  if (!text || typeof text !== 'string') {
    return {
      content: '',
      hasCode: false,
      hasLinks: false,
      wordCount: 0,
      codeBlocks: []
    };
  }

  const codeBlocks: CodeBlock[] = [];
  let processedContent = text;

  // Extract code blocks
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
  let codeMatch;

  while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
    const language = codeMatch[1] || 'text';
    const code = codeMatch[2].trim();

    if (code.length > 0) {
      const codeBlock: CodeBlock = {
        language: language,
        code: code,
        lineCount: code.split('\n').length
      };

      codeBlocks.push(codeBlock);
    }
  }

  // Check for inline code
  const inlineCodeRegex = /`([^`]+)`/g;
  const hasInlineCode = inlineCodeRegex.test(text);

  // Check for links
  const linkRegex = /(https?:\/\/[^\s]+)/g;
  const hasLinks = linkRegex.test(text);

  // Calculate word count
  const wordCount = processedContent.split(/\s+/).filter(word => word.length > 0).length;

  return {
    content: processedContent.trim(),
    hasCode: codeBlocks.length > 0 || hasInlineCode,
    hasLinks,
    wordCount,
    codeBlocks
  };
}

/**
 * Detect if message contains commands
 */
export function isCommand(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return text.trim().startsWith('/');
}

/**
 * Parse command from message
 */
export function parseCommand(text: string): { command: string; args: string[] } | null {
  if (!isCommand(text)) return null;

  const trimmed = text.trim().substring(1); // Remove '/'
  const parts = trimmed.split(/\s+/);

  return {
    command: parts[0].toLowerCase(),
    args: parts.slice(1)
  };
}

/**
 * Format text for display with proper line breaks and spacing
 */
export function formatDisplayText(text: string): string {
  if (!text) return '';

  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove excessive blank lines (more than 2)
    .replace(/\n{3,}/g, '\n\n')
    // Trim whitespace
    .trim();
}

/**
 * Extract key points from long messages for summaries
 */
export function extractKeyPoints(text: string, maxPoints: number = 5): string[] {
  if (!text || text.length < 100) return [];

  // Look for bullet points
  const bulletRegex = /^[•\-\*]\s+(.+)$/gm;
  const bullets = [];
  let match;

  while ((match = bulletRegex.exec(text)) !== null && bullets.length < maxPoints) {
    bullets.push(match[1].trim());
  }

  if (bullets.length > 0) return bullets;

  // Look for numbered lists
  const numberedRegex = /^\d+\.\s+(.+)$/gm;
  const numbered = [];

  while ((match = numberedRegex.exec(text)) !== null && numbered.length < maxPoints) {
    numbered.push(match[1].trim());
  }

  if (numbered.length > 0) return numbered;

  // Extract sentences that start with action words or key phrases
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10);
  const keyPhrases = /^(you can|you should|you need|you must|it's important|remember|note that|consider|try to)/i;

  return sentences
    .filter(sentence => keyPhrases.test(sentence))
    .slice(0, maxPoints);
}

/**
 * Estimate reading time for a message
 */
export function estimateReadingTime(text: string): number {
  if (!text) return 0;

  const wordsPerMinute = 200; // Average reading speed
  const wordCount = text.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / wordsPerMinute);

  return Math.max(1, minutes); // Minimum 1 minute
}

/**
 * Clean markdown for display in notifications or summaries
 */
export function stripMarkdown(text: string): string {
  if (!text) return '';

  return text
    // Remove headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold/italic
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Remove links
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, '[Code Block]')
    // Remove inline code
    .replace(/`(.+?)`/g, '$1')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}
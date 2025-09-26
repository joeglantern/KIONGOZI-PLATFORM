// Message processing utilities extracted from AskAI component

import type { Message } from '../types/chat';
import { detectArtifacts } from './artifact-detector';
import { sanitizeMessageContent, isValidJSON } from './chatUtils';

// Process markdown content and convert to HTML
export const processMarkdown = (content: string): string => {
  // Check if content starts with something that looks like JSON and try to parse it
  if (content.trim().startsWith('{') || content.trim().startsWith('[') || content.trim().startsWith('``json') || content.trim().startsWith('```json')) {
    try {
      // Extract JSON from markdown code blocks if present
      if (content.includes('```json')) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          // Parse the JSON and convert it to a readable format
          const jsonData = JSON.parse(jsonMatch[1].trim());
          return `<div class="prose prose-sm dark:prose-invert max-w-none">
                    ${content.replace(/```json\s*([\s\S]*?)\s*```/,
                      `<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto my-2">
                        <pre class="text-sm font-mono">${JSON.stringify(jsonData, null, 2)}</pre>
                      </div>`
                    )}
                  </div>`;
        }
      }

      // Check for raw JSON without code blocks
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          const jsonData = JSON.parse(content.trim());
          return `<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto my-2">
                    <pre class="text-sm font-mono">${JSON.stringify(jsonData, null, 2)}</pre>
                  </div>`;
        } catch (e) {
          // If JSON parsing fails, continue with regular markdown processing
          console.warn("Failed to parse potential JSON content:", e);
        }
      }
    } catch (e) {
      console.warn("Error handling JSON content:", e);
    }
  }

  // Replace markdown patterns with HTML

  // Handle bold: **text** or __text__
  content = content.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // Handle italic: *text* or _text_
  content = content.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // Handle links: [text](url)
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Handle headings: ## Heading
  content = content.replace(/^##\s+(.*?)$/gm, '<h2 class="text-xl font-bold my-2">$1</h2>');
  content = content.replace(/^###\s+(.*?)$/gm, '<h3 class="text-lg font-bold my-2">$1</h3>');
  content = content.replace(/^####\s+(.*?)$/gm, '<h4 class="text-lg font-semibold my-2">$1</h4>');

  // Handle code blocks with language: ```language code ```
  content = content.replace(/```([a-z]*)\n([\s\S]*?)```/g,
    '<div class="bg-gray-100 dark:bg-gray-800 p-3 rounded-md overflow-auto my-2"><pre class="text-sm font-mono">$2</pre></div>');

  // Better list handling - convert consecutive list items to proper HTML lists
  // First, detect groups of consecutive list items
  let inList = false;
  const lines = content.split('\n');
  const processedLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isListItem = /^[\s]*[-*]\s+(.*)$/.test(line) || /^[\s]*\d+\.\s+(.*)$/.test(line);

    if (isListItem && !inList) {
      // Start of a new list
      processedLines.push('<ul class="list-disc pl-5 my-2">');
      inList = true;
    } else if (!isListItem && inList) {
      // End of a list
      processedLines.push('</ul>');
      inList = false;
    }

    if (isListItem) {
      // Process the list item, removing the marker
      const itemContent = line.replace(/^[\s]*[-*\d.]\s+/, '');
      processedLines.push(`<li>${itemContent}</li>`);
    } else {
      processedLines.push(line);
    }
  }

  // Close any open list
  if (inList) {
    processedLines.push('</ul>');
  }

  content = processedLines.join('\n');

  // Handle blockquotes: > text
  content = content.replace(/^>\s+(.*?)$/gm, '<blockquote class="pl-4 border-l-4 border-gray-300 text-gray-600 dark:text-gray-400 italic my-2">$1</blockquote>');

  // Handle inline code: `code`
  content = content.replace(/`([^`]+)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-sm">$1</code>');

  // Handle horizontal rules: ---
  content = content.replace(/^---$/gm, '<hr class="my-4 border-t border-gray-300 dark:border-gray-700">');

  // Convert newlines to <br> (except within lists, which we've already processed)
  content = content.replace(/(?!<\/li>|<li>|<\/ul>|<ul[^>]*>)\n/g, '<br>');

  return content;
};

// Process message content and detect artifacts
export const processMessageContent = (text: string): { content: string; artifacts: any[] } => {
  // Sanitize the content first
  const sanitizedText = sanitizeMessageContent(text);

  // Process markdown
  const processedContent = processMarkdown(sanitizedText);

  // Detect artifacts in the original text
  const artifactDetection = detectArtifacts(sanitizedText, 'temp-id');

  return {
    content: processedContent,
    artifacts: [] // Return empty array for now, artifacts will be handled by the system
  };
};

// Extract plain text from HTML content
export const extractPlainText = (html: string): string => {
  if (typeof document === 'undefined') {
    // Server-side: simple regex approach
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  // Client-side: use DOM API
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
};

// Convert message to plain text for search/indexing
export const messageToPlainText = (message: Message): string => {
  if (!message.text) return '';
  return extractPlainText(message.text);
};

// Highlight search terms in text
export const highlightSearchTerms = (text: string, searchTerm: string): string => {
  if (!searchTerm.trim()) return text;

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>');
};

// Parse mentions in message (e.g., @username)
export const parseMentions = (text: string): { text: string; mentions: string[] } => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }

  const processedText = text.replace(mentionRegex, '<span class="text-primary-500 font-medium">@$1</span>');

  return { text: processedText, mentions };
};

// Parse hashtags in message (e.g., #topic)
export const parseHashtags = (text: string): { text: string; hashtags: string[] } => {
  const hashtagRegex = /#(\w+)/g;
  const hashtags: string[] = [];
  let match;

  while ((match = hashtagRegex.exec(text)) !== null) {
    hashtags.push(match[1]);
  }

  const processedText = text.replace(hashtagRegex, '<span class="text-secondary-500 font-medium">#$1</span>');

  return { text: processedText, hashtags };
};

// Extract URLs from message text
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls: string[] = [];
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  return urls;
};

// Create message preview (truncated content without HTML)
export const createMessagePreview = (message: Message, maxLength: number = 100): string => {
  const plainText = messageToPlainText(message);

  if (plainText.length <= maxLength) return plainText;

  return plainText.slice(0, maxLength).trim() + '...';
};

// Check if message contains sensitive content
export const containsSensitiveContent = (text: string): boolean => {
  const sensitivePatterns = [
    /password/gi,
    /api[_\s]?key/gi,
    /secret/gi,
    /token/gi,
    /private[_\s]?key/gi,
    /credit[_\s]?card/gi,
    /ssn/gi,
    /social[_\s]?security/gi
  ];

  return sensitivePatterns.some(pattern => pattern.test(text));
};

// Format message timestamp
export const formatMessageTimestamp = (timestamp: string | Date, format: 'short' | 'long' = 'short'): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (format === 'short') {
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return date.toLocaleDateString();
  }

  // Long format
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) !== 1 ? 's' : ''} ago`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)} day${Math.floor(diffInMinutes / 1440) !== 1 ? 's' : ''} ago`;

  return date.toLocaleString();
};

// Validate message before processing
export const validateMessage = (text: string): { isValid: boolean; error?: string; warnings?: string[] } => {
  const warnings: string[] = [];

  if (!text || !text.trim()) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (text.length > 10000) {
    return { isValid: false, error: 'Message is too long (maximum 10,000 characters)' };
  }

  if (containsSensitiveContent(text)) {
    warnings.push('Message may contain sensitive information');
  }

  const urls = extractUrls(text);
  if (urls.length > 10) {
    warnings.push('Message contains many URLs');
  }

  return { isValid: true, warnings: warnings.length > 0 ? warnings : undefined };
};

// Split long message into chunks
export const splitLongMessage = (text: string, maxLength: number = 2000): string[] => {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let currentChunk = '';

  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        // Single sentence is too long, split by words
        const words = sentence.split(' ');
        let wordChunk = '';

        for (const word of words) {
          if ((wordChunk + ' ' + word).length > maxLength) {
            if (wordChunk) {
              chunks.push(wordChunk.trim());
              wordChunk = word;
            } else {
              // Single word is too long, just add it
              chunks.push(word);
            }
          } else {
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
        }

        if (wordChunk) {
          currentChunk = wordChunk;
        }
      }
    } else {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};
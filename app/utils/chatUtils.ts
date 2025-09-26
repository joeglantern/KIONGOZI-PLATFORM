// Chat utility functions extracted from AskAI component

// Helper function to detect mobile devices
export const isMobileDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
         (typeof window !== 'undefined' && window.innerWidth < 768);
};

// Helper function to generate unique IDs
export const generateUniqueId = (): number => {
  return Date.now() + Math.random();
};

// Helper function to format conversation title from first message
export const formatConversationTitle = (firstMessage: string): string => {
  // Trim and limit to 50 characters
  const title = firstMessage.trim().slice(0, 50);
  return title.length < firstMessage.trim().length ? `${title}...` : title;
};

// Helper function to format timestamp
export const formatTimestamp = (timestamp?: string | Date): string => {
  if (!timestamp) return 'Unknown';

  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;

  // Check if date is valid
  if (isNaN(date.getTime())) return 'Unknown';

  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`;
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString();
  }
};

// Helper function to truncate text
export const truncateText = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

// Helper function to sanitize message content
export const sanitizeMessageContent = (content: string): string => {
  // Remove potentially harmful content
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
};

// Helper function to check if message contains code
export const containsCode = (text: string): boolean => {
  return /```[\s\S]*?```|`[^`]+`/.test(text);
};

// Helper function to extract code blocks
export const extractCodeBlocks = (text: string): Array<{ language: string; code: string }> => {
  const codeBlocks: Array<{ language: string; code: string }> = [];
  const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      code: match[2].trim()
    });
  }

  return codeBlocks;
};

// Helper function to count words
export const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

// Helper function to estimate reading time
export const estimateReadingTime = (text: string): number => {
  const wordsPerMinute = 200; // Average reading speed
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
};

// Helper function to validate message input
export const validateMessageInput = (input: string): { isValid: boolean; error?: string } => {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (trimmedInput.length > 10000) {
    return { isValid: false, error: 'Message is too long (max 10,000 characters)' };
  }

  return { isValid: true };
};

// Helper function to scroll to bottom of container
export const scrollToBottom = (element: HTMLElement | null, smooth: boolean = true): void => {
  if (!element) return;

  element.scrollTo({
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  });
};

// Helper function to check if user has scrolled near bottom
export const isNearBottom = (element: HTMLElement, threshold: number = 100): boolean => {
  if (!element) return false;

  const { scrollTop, scrollHeight, clientHeight } = element;
  return scrollHeight - scrollTop - clientHeight < threshold;
};

// Helper function to debounce function calls
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

// Helper function to throttle function calls
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void => {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Helper function to copy text to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (error) {
    console.error('Failed to copy text to clipboard:', error);
    return false;
  }
};

// Helper function to format file size
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to generate conversation slug
export const generateConversationSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 50);
};

// Helper function to check if string is JSON
export const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
};

// Helper function to safely parse JSON
export const safeJSONParse = <T = any>(str: string, defaultValue: T): T => {
  try {
    return JSON.parse(str);
  } catch (e) {
    return defaultValue;
  }
};

// Helper function to get system theme preference
export const getSystemThemePreference = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

// Helper function to format duration in milliseconds to human readable
export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

// Helper function to create delay
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper function to retry async operation
export const retryAsync = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }

  throw lastError!;
};
// Chat Components - Modular Architecture
// This file exports all the refactored chat components

// Core Components
export { default as ChatContainer } from './ChatContainer';
export { default as MessageList } from './MessageList';
export { default as MessageBubble } from './MessageBubble';
export { default as ChatInput } from './ChatInput';

// UI Components
export { default as LoadingDots } from './LoadingDots';
export { default as TypewriterEffect } from './TypewriterEffect';
export { default as ChatSidebar } from './ChatSidebar';
export { default as ThemeToggle } from './ThemeToggle';
export { default as ProfileMenu } from './ProfileMenu';
export { default as ModernChatLayout } from './ModernChatLayout';

// Context and Provider
export { ChatProvider, useChatContext, ChatContext } from './ChatProvider';

// Re-export types for convenience
export type {
  Message,
  Conversation,
  ChatMode,
  ChatSettings,
  ChatState,
  ChatActions,
  ChatContextType,
  MessageBubbleProps,
  MessageListProps,
  ChatInputProps,
  TypewriterEffectProps,
  LoadingDotsProps
} from '../../types/chat';

// Re-export hooks
export { useChat } from '../../hooks/useChat';
export { useVoiceInput } from '../../hooks/useVoiceInput';

// Re-export utilities
export {
  isMobileDevice,
  generateUniqueId,
  scrollToBottom,
  copyToClipboard,
  formatTimestamp,
  truncateText
} from '../../utils/chatUtils';

export {
  processMarkdown,
  processMessageContent,
  extractPlainText,
  messageToPlainText,
  validateMessage
} from '../../utils/messageProcessing';
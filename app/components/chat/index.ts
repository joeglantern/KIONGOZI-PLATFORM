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
export { default as ProfileMenu } from './ProfileMenu';
export { default as ModernChatLayout } from './ModernChatLayout';

// LMS Integration Components
export { default as SmartSuggestions } from './suggestions/SmartSuggestions';
export { default as SuggestionCard } from './suggestions/SuggestionCard';

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

// LMS-Chat integration types
export type {
  ChatSuggestion,
  SuggestionCategory,
  SmartSuggestionsProps,
  SuggestionCardProps,
  LearningStatsWidgetProps,
  CompactLearningStats
} from '../../types/lms-chat';

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
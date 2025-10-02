import type { ResearchResponse } from '../utils/deep-research-agent';
import type { Artifact } from '../components/artifacts/types';
import type { EnhancedCommandResponse } from './lms';

// Use the ResearchResponse type as DeepResearchResponse for all references
export type DeepResearchResponse = ResearchResponse;

// Extended message interface to support research mode and artifacts
export interface Message {
  text: string;
  isUser: boolean;
  id: number;
  type?: 'chat' | 'research';
  researchData?: DeepResearchResponse;
  isTypingComplete?: boolean;
  artifacts?: Artifact[];
  commandResponse?: EnhancedCommandResponse; // For command responses like search results
}


// Chat mode types (simplified - research mode removed)
export type ChatMode = 'chat';

// Voice input states
export type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error';

// Conversation interface for sidebar
export interface Conversation {
  id: string;
  title: string;
  slug?: string;
  lastMessage?: string;
  lastMessageIsUser?: boolean;
  lastMessageAt?: string;
  updatedAt: string;
  createdAt?: string;
  messageCount?: number;
  isStarred?: boolean;
  isArchived?: boolean;
  messages?: any[]; // Optional messages array for export functionality
}

// Chat settings interface
export interface ChatSettings {
  darkMode: boolean;
  showTypingEffect: boolean;
  autoCollapseOnMouseLeave: boolean;
  showSidebar: boolean;
}

// Chat state interface for context
export interface ChatState {
  // Messages
  messages: Message[];
  input: string;
  isLoading: boolean;
  isGenerating: boolean;

  // Current conversation
  currentConversationId: string | null;
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  hasMoreConversations: boolean;
  isLoadingMore: boolean;

  // UI state
  mode: ChatMode;
  settings: ChatSettings;
  showSidebar: boolean;
  isSidebarCollapsed: boolean;
  profileMenuOpen: boolean;

  // Typing and animations
  typingMessageId: number | null;
  showModeChangeAnimation: boolean;
  hasFirstUserMessage: boolean;


  // Artifacts
  selectedArtifact: Artifact | null;

  // Voice input
  voiceInputState: VoiceInputState;

  // Loading and focus states
  isInputFocused: boolean;
  showLoader: boolean;

  // Progressive document
  showProgressiveDoc: boolean;
  docGenEnabled: boolean;

  // Tools
  showToolsMenu: boolean;

  // Export modal
  showExportModal: boolean;

  // Mobile
  isMobile: boolean;
}

// Chat actions interface
export interface ChatActions {
  // Message actions
  sendMessage: (text: string) => Promise<void>;
  setInput: (input: string) => void;
  clearMessages: () => void;

  // Conversation actions
  createNewConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateConversation: (conversation: Conversation) => void;
  loadMoreConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>;

  // Mode actions
  setMode: (mode: ChatMode) => void;

  // UI actions
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setProfileMenuOpen: (open: boolean) => void;

  // Settings actions
  updateSettings: (settings: Partial<ChatSettings>) => void;
  toggleDarkMode: () => void;



  // Artifact actions
  setSelectedArtifact: (artifact: Artifact | null) => void;

  // Voice actions
  startVoiceInput: () => void;
  stopVoiceInput: () => void;
  setVoiceInputState: (state: VoiceInputState) => void;

  // Focus actions
  setInputFocused: (focused: boolean) => void;

  // Progressive document actions
  toggleProgressiveDoc: () => void;
  setDocGenEnabled: (enabled: boolean) => void;

  // Tools actions
  setShowToolsMenu: (show: boolean) => void;

  // Export actions
  toggleExportModal: () => void;
  setShowExportModal: (show: boolean) => void;
  exportConversations: (conversationIds: string[], format: 'text' | 'markdown' | 'json', includeMetadata: boolean) => Promise<void>;
}

// Combined chat context interface
export interface ChatContextType extends ChatState, ChatActions {}

// Component prop interfaces
export interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
  showAvatar?: boolean;
  onArtifactClick?: (artifact: Artifact) => void;
}

export interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  typingMessageId?: number | null;
  onArtifactClick?: (artifact: Artifact) => void;
  className?: string;
}

export interface ChatInputProps {
  input: string;
  onInputChange: (value: string) => void;
  onSendMessage: (text: string) => Promise<void>;
  isLoading?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  onFocusChange?: (focused: boolean) => void;
  showVoiceInput?: boolean;
  onVoiceInputStart?: () => void;
}

export interface ChatSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onNewConversation: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export interface ModeSwitcherProps {
  mode: ChatMode;
  onModeChange: (mode: ChatMode) => void;
  showAnimation?: boolean;
  className?: string;
}

export interface TypewriterEffectProps {
  text: string;
  onComplete?: () => void;
  speed?: number;
  className?: string;
}

export interface LoadingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Hook return types
export interface UseChatReturn extends ChatContextType {}

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string;
  error: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export interface UseResearchReturn {
  isResearching: boolean;
  researchData: DeepResearchResponse | null;
  error: string | null;
  startResearch: (query: string) => Promise<void>;
  clearResearch: () => void;
}

// API response types for chat
export interface ChatMessageResponse {
  success: boolean;
  data?: {
    id: string;
    content: string;
    conversation_id: string;
    created_at: string;
  };
  error?: string;
}

export interface ConversationResponse {
  success: boolean;
  data?: Conversation[];
  error?: string;
}

// Error types
export interface ChatError {
  message: string;
  type: 'network' | 'api' | 'validation' | 'unknown';
  details?: any;
}
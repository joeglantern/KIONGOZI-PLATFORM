// LMS-Chat Integration Type Definitions

import type { LearningModule, LearningStats, ModuleRecommendation } from './lms';

// Suggestion Types
export interface ChatSuggestion {
  id: string;
  type: 'featured_module' | 'recent_module' | 'trending_module' | 'quick_action' | 'smart_question' | 'custom';
  title: string;
  description?: string;
  action: string; // The text that will be sent to chat when clicked
  icon?: string;
  category?: string;
  module?: LearningModule;
}

export interface SuggestionCategory {
  id: string;
  title: string;
  icon?: string;
  suggestions: ChatSuggestion[];
}

// Smart Suggestions Component Props
export interface SmartSuggestionsProps {
  onSuggestionClick: (suggestion: ChatSuggestion) => void;
  isLoading?: boolean;
  className?: string;
  maxSuggestions?: number;
  showCategories?: boolean;
}

export interface SuggestionCardProps {
  suggestion: ChatSuggestion;
  onClick: (suggestion: ChatSuggestion) => void;
  variant?: 'default' | 'compact' | 'featured';
  className?: string;
}

// Learning Stats Widget Types
export interface LearningStatsWidgetProps {
  className?: string;
  variant?: 'full' | 'compact' | 'minimal';
  showProgress?: boolean;
  showStreak?: boolean;
  onStatsClick?: () => void;
}

export interface CompactLearningStats {
  completionRate: number;
  modulesCompleted: number;
  totalModules: number;
  currentStreak: number;
  weeklyProgress: number;
}

// Module Search Types
export interface ModuleSearchResult {
  module: LearningModule;
  relevanceScore: number;
  matchedKeywords: string[];
  snippet?: string;
}

export interface ModuleSearchResultsProps {
  results: ModuleSearchResult[];
  query: string;
  isLoading?: boolean;
  onModuleSelect: (module: LearningModule) => void;
  onBookmark: (moduleId: string, bookmarked: boolean) => void;
  className?: string;
}

// Chat Command Types
export interface ChatCommand {
  command: string;
  description: string;
  parameters?: string[];
  handler: (params: string[]) => Promise<any>;
}

// Progress Update Types
export interface ProgressUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  module?: LearningModule;
  currentProgress?: number;
  onProgressUpdate: (moduleId: string, progress: number, notes?: string) => Promise<void>;
}

// Recommendation Types
export interface SmartRecommendationProps {
  recommendations: ModuleRecommendation[];
  onRecommendationClick: (module: LearningModule) => void;
  isLoading?: boolean;
  variant?: 'carousel' | 'grid' | 'list';
  className?: string;
}

// API Response Extensions
export interface SuggestionsResponse {
  success: boolean;
  data: {
    featured: ChatSuggestion[];
    recent: ChatSuggestion[];
    quickActions: ChatSuggestion[];
    personalized: ChatSuggestion[];
  };
}

// Mobile-specific types
export interface MobileOptimizedProps {
  isMobile?: boolean;
  touchFriendly?: boolean;
  swipeEnabled?: boolean;
}

// Error handling
export interface LMSChatError {
  type: 'api_error' | 'network_error' | 'validation_error';
  message: string;
  details?: any;
  recoverable: boolean;
}
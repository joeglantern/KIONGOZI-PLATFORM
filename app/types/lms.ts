// Learning Management System Type Definitions

export interface ModuleCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  content: string;
  category_id: string;
  category?: ModuleCategory;
  author_id: string;
  author_name?: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number;
  learning_objectives: string[];
  keywords: string[];
  prerequisites?: string[];
  featured: boolean; // Aligned with mobile app
  is_featured?: boolean; // Keep for backward compatibility
  status: 'draft' | 'published' | 'archived'; // Aligned with mobile app
  is_published?: boolean; // Keep for backward compatibility
  view_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  module?: LearningModule;
  status: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
  progress_percentage: number;
  time_spent_minutes: number;
  notes?: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

export interface LearningStats {
  total_modules: number;
  completed_modules: number;
  in_progress_modules: number;
  bookmarked_modules: number;
  total_time_spent_minutes: number;
  completion_rate: number;
  current_streak_days: number;
  longest_streak_days: number;
  recent_activity: UserProgress[];
  favorite_categories: {
    category: ModuleCategory;
    modules_completed: number;
  }[];
}

export interface CategoryProgress {
  category_id: string;
  category_name: string;
  total_modules: number;
  completed_modules: number;
  completion_percentage: number;
  color?: string;
}

export interface RecentActivity {
  module_id: string;
  module_title: string;
  action: 'started' | 'completed' | 'updated_progress';
  timestamp: string;
  progress_percentage?: number;
}

export interface ModuleRecommendation {
  module: LearningModule;
  reason: string;
  confidence_score: number;
}

export interface ModuleFilters {
  category_id?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  is_featured?: boolean;
  search?: string;
  keywords?: string[];
}

export interface ModulePagination {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ModulesResponse {
  modules: LearningModule[];
  pagination: ModulePagination;
  filters: ModuleFilters;
}

// API Response types extending existing ApiResponse
export interface LearningStatsResponse {
  success: boolean;
  data: LearningStats;
}

export interface ModuleRecommendationsResponse {
  success: boolean;
  data: ModuleRecommendation[];
}

export interface ProgressUpdateRequest {
  module_id: string;
  status?: UserProgress['status'];
  progress_percentage?: number;
  time_spent_minutes?: number;
  notes?: string;
}

// UI State types
export interface ModuleCardProps {
  module: LearningModule;
  progress?: UserProgress;
  onProgressUpdate?: (progress: UserProgress) => void;
  variant?: 'default' | 'compact' | 'featured';
}

export interface CategoryFilterProps {
  categories: ModuleCategory[];
  selectedCategory?: string;
  onCategoryChange: (categoryId?: string) => void;
}

export interface ProgressIndicatorProps {
  progress: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  className?: string;
}

// Command Response Types for Chat Integration
export interface ModuleCommandResponse {
  type: 'modules';
  title: string;
  description: string;
  modules: LearningModule[];
  total_count?: number;
  category?: ModuleCategory;
  search_query?: string;
}

export interface ProgressCommandResponse {
  type: 'progress';
  title: string;
  description: string;
  stats: LearningStats;
  recent_modules: UserProgress[];
}

export interface CategoryCommandResponse {
  type: 'categories';
  title: string;
  description: string;
  categories: ModuleCategory[];
}

// Union type for all command responses
export type CommandResponse =
  | ModuleCommandResponse
  | ProgressCommandResponse
  | CategoryCommandResponse;

// Enhanced interface for command processing
export interface EnhancedCommandResponse {
  type: 'command_response';
  command: string;
  title: string;
  content: string;
  success: boolean;
  data?: CommandResponse;
}

// Learning Path types (for future implementation)
export interface LearningPath {
  id: string;
  title: string;
  description: string;
  modules: LearningModule[];
  estimated_duration_minutes: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  prerequisites?: string[];
}
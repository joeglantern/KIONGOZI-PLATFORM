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
  is_featured: boolean;
  is_published: boolean;
  view_count: number;
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
  modules_started: number;
  modules_completed: number;
  modules_in_progress: number;
  modules_bookmarked: number;
  completion_rate: number;
  average_progress: number;
  total_time_spent: number;
  learning_streak: number;
  categories_progress: CategoryProgress[];
  recent_activity: RecentActivity[];
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
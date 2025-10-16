/**
 * LMS (Learning Management System) Type Definitions
 * Shared between mobile and web applications
 */

export interface ModuleCategory {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  overview?: string;
  category_id?: string;
  category?: ModuleCategory;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_hours: number;
  prerequisites: string[];
  learning_outcomes: string[];
  author_id: string;
  author_name?: string;
  author_email?: string;
  status: 'draft' | 'published' | 'archived';
  review_status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  published_at?: string;
  featured: boolean;
  enrollment_count: number;
  view_count: number;
  module_count?: number;
  current_enrollments?: number;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  module_id: string;
  order_index: number;
  is_required: boolean;
  learning_modules?: LearningModule;
  created_at: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  progress_percentage: number;
  completed_at?: string;
  certificate_issued: boolean;
  last_accessed_at: string;
  created_at: string;
  updated_at: string;
  courses?: Course;
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
  featured: boolean;
  status: 'draft' | 'published' | 'archived';
  view_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: string;
  module?: LearningModule; // Alias for compatibility
  learning_modules?: LearningModule; // Actual API response field name
  status: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
  progress_percentage: number;
  time_spent_minutes: number;
  started_at?: string;
  completed_at?: string;
  last_accessed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Flat structure for stats (used in ProfileScreen and other places)
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

// Actual API response structure from /api/progress/stats
export interface LearningStatsApiResponse {
  overview: {
    total_modules_started: number;
    completed_modules: number;
    in_progress_modules: number;
    bookmarked_modules: number;
    completion_rate: number;
    average_progress: number;
    total_time_spent_minutes: number;
    current_streak_days: number;
  };
  categories: {
    category: ModuleCategory;
    modules_completed: number;
    modules_in_progress: number;
    total_modules: number;
  }[];
  recent_activity: UserProgress[];
}

export interface ModuleSearchResult {
  modules: LearningModule[];
  categories: ModuleCategory[];
  total_count: number;
  search_query?: string;
  filters_applied?: {
    category_id?: string;
    difficulty_level?: string;
    featured?: boolean;
  };
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
  completed_courses?: CourseEnrollment[];
}

export interface CategoryCommandResponse {
  type: 'categories';
  title: string;
  description: string;
  categories: ModuleCategory[];
}

export interface CourseCommandResponse {
  type: 'courses';
  title: string;
  description: string;
  courses: Course[];
  total_count?: number;
  category?: ModuleCategory;
  search_query?: string;
}

export interface EnrollmentCommandResponse {
  type: 'enrollments';
  title: string;
  description: string;
  enrollments: CourseEnrollment[];
  total_count?: number;
  status_filter?: string;
}

// Union type for all command responses
export type CommandResponse = 
  | ModuleCommandResponse 
  | ProgressCommandResponse 
  | CategoryCommandResponse
  | CourseCommandResponse
  | EnrollmentCommandResponse;

// Utility types for API responses
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}


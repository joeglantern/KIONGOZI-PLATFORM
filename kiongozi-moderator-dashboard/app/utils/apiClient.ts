/**
 * Centralized API Client for Kiongozi Platform
 * This file provides a consistent way to communicate with the API server
 * and handles authentication, error handling, and response formatting.
 */

import type {
  ModuleCategory,
  LearningModule,
  UserProgress,
  LearningStats,
  ModuleRecommendation,
  ModuleFilters,
  ModulesResponse,
  ProgressUpdateRequest
} from '../types/lms';

const API_BASE_URL = '/api-proxy';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from window (set by SupabaseTokenBridge)
   */
  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Primary source: window token (set by SupabaseTokenBridge)
    const windowToken = (window as any).supabaseToken;
    if (windowToken && this.isValidTokenFormat(windowToken)) {
      return windowToken;
    }

    // Secondary fallback: try localStorage (simplified)
    try {
      const localStorage = window.localStorage;
      if (localStorage) {
        // Try common Supabase auth token patterns
        const possibleKeys = [
          'sb-uposzscjqzdttnkcllgy-auth-token',
          'sb-jdncfyagppohtksogzkx-auth-token',
          'sb-vjwvtnjsrtakgpvqfpejo-auth-token'
        ];

        for (const key of possibleKeys) {
          const stored = localStorage.getItem(key);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.access_token && this.isValidTokenFormat(parsed.access_token)) {
                return parsed.access_token;
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ [ApiClient] Could not access localStorage:', error);
    }

    return null;
  }


  /**
   * Extract payload from JWT token
   */
  private getTokenPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }

  /**
   * Attempt to refresh the authentication token
   */
  private async attemptTokenRefresh(): Promise<boolean> {
    try {
      // Try to refresh using the refresh token endpoint
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for refresh token
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data?.access_token) {
          // Update window token
          if (typeof window !== 'undefined') {
            (window as any).supabaseToken = data.data.access_token;
          }
          console.log('✅ [ApiClient] Token refreshed');
          return true;
        }
      }
    } catch (error) {
      console.error('❌ [ApiClient] Token refresh error:', error);
    }
    return false;
  }

  /**
   * Retry the request with the new token after refresh
   */
  private async retryRequestWithNewToken<T>(endpoint: string, options: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    if (!token) {
      return {
        success: false,
        error: 'No token available after refresh',
      };
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kiongozi-Frontend/1.0',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          details: data.details,
        };
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: 'Network error on retry',
        details: error.message,
      };
    }
  }

  /**
   * Simple validation to check if token looks like a JWT
   */
  private isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    return parts.length === 3 && parts[0].length > 10;
  }

  /**
   * Make HTTP request with proper headers and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getAuthToken();

    // Debug logging for token issues
    // Public endpoints (courses, categories, modules) work without auth
    const isPublicEndpoint = endpoint.includes('/courses') ||
                             endpoint.includes('/categories') ||
                             endpoint.includes('/modules');

    if (!token && !isPublicEndpoint) {
      console.warn('⚠️ [ApiClient] No auth token for protected endpoint:', endpoint);
    } else if (token) {
      console.log('✅ [ApiClient] Authenticated request to:', endpoint);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kiongozi-Frontend/1.0',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Removed verbose logging for cleaner console

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Response received successfully

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ [ApiClient] Failed to parse JSON response:', parseError);
        const textResponse = await response.text();
        console.log('📄 [ApiClient] Raw response text:', textResponse);
        return {
          success: false,
          error: 'Invalid JSON response',
          details: `Status: ${response.status}, Text: ${textResponse.substring(0, 200)}`
        };
      }

      // Data parsed successfully

      if (!response.ok) {
        // Handle 401 Unauthorized - try to refresh token
        if (response.status === 401) {
          console.warn('⚠️ [ApiClient] 401 Unauthorized - attempting token refresh');
          const refreshSuccess = await this.attemptTokenRefresh();

          if (refreshSuccess) {
            console.log('✅ [ApiClient] Token refreshed, retrying request');
            // Retry the original request once with new token
            return this.retryRequestWithNewToken(endpoint, options);
          } else {
            console.error('❌ [ApiClient] Token refresh failed, user needs to re-authenticate');
          }
        }

        // Only log meaningful errors (not empty objects/arrays)
        const hasError = data.error && (typeof data.error === 'string' || Object.keys(data.error).length > 0);
        const hasDetails = data.details && (typeof data.details === 'string' || Object.keys(data.details).length > 0);

        if (hasError || hasDetails) {
          console.warn(`⚠️ [ApiClient] Request failed (${response.status}):`, data.error || data.details);
        }
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          details: data.details,
        };
      }

      return data;
    } catch (error: any) {
      console.error('❌ [ApiClient] Network error:', {
        url,
        error: error.message,
        name: error.name
      });
      return {
        success: false,
        error: 'Network error',
        details: error.message,
      };
    }
  }

  // GET request
  async get<T>(endpoint: string, options?: { params?: Record<string, any> }): Promise<ApiResponse<T>> {
    let url = endpoint;
    if (options?.params) {
      const queryString = new URLSearchParams(
        Object.entries(options.params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      url = `${endpoint}${queryString ? `?${queryString}` : ''}`;
    }
    return this.request<T>(url, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PATCH request
  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * Admin API Methods
   */

  // Get all users with pagination and filters
  async getUsers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    role?: string;
    search?: string;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;
    return this.get(endpoint);
  }

  // Get user by ID with detailed info
  async getUserById(userId: string) {
    return this.get(`/admin/users/${userId}`);
  }

  // Update user status (ban/unban/activate/deactivate)
  async updateUserStatus(userId: string, status: string, reason?: string) {
    return this.patch(`/admin/users/${userId}/status`, { status, reason });
  }

  // Update user role
  async updateUserRole(userId: string, role: string) {
    return this.patch(`/admin/users/${userId}/role`, { role });
  }

  // Create new user
  async createUser(userData: {
    email: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
    role?: string;
    password: string;
  }) {
    return this.post('/admin/users', userData);
  }

  // Get dashboard stats
  async getDashboardStats() {
    return this.get('/admin/dashboard/stats');
  }

  // Get system logs
  async getLogs(params?: {
    page?: number;
    limit?: number;
    level?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/admin/logs${queryString ? `?${queryString}` : ''}`;
    return this.get(endpoint);
  }

  /**
   * Health Check Methods
   */

  // Basic health check
  async health() {
    return this.get('/health');
  }

  // Detailed health check
  async healthDetailed() {
    return this.get('/health/detailed');
  }

  /**
   * Authentication Methods
   */

  // Login with email/password
  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  // Register new account
  async register(userData: {
    email: string;
    password: string;
    full_name: string;
    first_name?: string;
    last_name?: string;
  }) {
    return this.post('/auth/register', userData);
  }

  // Refresh token
  async refreshToken() {
    return this.post('/auth/refresh');
  }

  // Get current authenticated user
  async getCurrentUser() {
    return this.get('/auth/user');
  }

  // Logout user
  async logout() {
    return this.post('/auth/logout');
  }

  /**
   * Chat Methods
   */

  // Send user message to chat
  async sendMessage(text: string, conversation_id?: string) {
    return this.post('/chat/message', { text, conversation_id });
  }

  // Save assistant message to conversation
  async saveAssistantMessage(text: string, conversation_id: string, type?: 'chat' | 'research', research_data?: any) {
    return this.post('/chat/message/assistant', { text, conversation_id, type, research_data });
  }

  // Get user's conversations
  async getConversations(params?: {
    limit?: number;
    offset?: number;
    q?: string;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/chat/conversations${queryString ? `?${queryString}` : ''}`;
    return this.get(endpoint);
  }

  // Get conversation messages
  async getConversationMessages(conversationId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/chat/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
    return this.get(endpoint);
  }

  // Delete conversation
  async deleteConversation(conversationId: string) {
    return this.delete(`/chat/conversations/${conversationId}`);
  }

  // Update conversation title and/or slug
  async updateConversation(conversationId: string, updates: { title?: string; slug?: string }) {
    return this.put(`/chat/conversations/${conversationId}`, updates);
  }

  // Update conversation title (backward compatibility)
  async updateConversationTitle(conversationId: string, title: string) {
    return this.updateConversation(conversationId, { title });
  }

  // Generate AI response via backend
  async generateAIResponse(message: string, conversationId?: string, type: 'chat' | 'research' = 'chat') {
    return this.post('/chat/ai-response', {
      message,
      conversation_id: conversationId,
      type
    });
  }

  /**
   * Learning Management System (LMS) Methods
   */

  // Get all module categories
  async getModuleCategories(): Promise<ApiResponse<ModuleCategory[]>> {
    return this.get('/content/categories');
  }

  // Get learning modules with filters and pagination
  async getLearningModules(filters?: ModuleFilters & { page?: number; limit?: number }): Promise<ApiResponse<ModulesResponse>> {
    const queryParams = new URLSearchParams();

    if (filters?.category_id) queryParams.append('category_id', filters.category_id);
    if (filters?.difficulty_level) queryParams.append('difficulty_level', filters.difficulty_level);
    if (filters?.is_featured !== undefined) queryParams.append('is_featured', filters.is_featured.toString());
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.page) queryParams.append('page', filters.page.toString());
    if (filters?.limit) queryParams.append('limit', filters.limit.toString());
    if (filters?.keywords?.length) {
      filters.keywords.forEach(keyword => queryParams.append('keywords', keyword));
    }

    const queryString = queryParams.toString();
    return this.get(`/content/modules${queryString ? `?${queryString}` : ''}`);
  }

  // Get specific learning module by ID
  async getLearningModule(moduleId: string): Promise<ApiResponse<LearningModule>> {
    return this.get(`/content/modules/${moduleId}`);
  }

  // Create new learning module (requires content editor+ role)
  async createLearningModule(moduleData: Partial<LearningModule>): Promise<ApiResponse<LearningModule>> {
    return this.post('/content/modules', moduleData);
  }

  // Update existing learning module (requires author/moderator role)
  async updateLearningModule(moduleId: string, moduleData: Partial<LearningModule>): Promise<ApiResponse<LearningModule>> {
    return this.put(`/content/modules/${moduleId}`, moduleData);
  }

  // Delete learning module (requires author/admin role)
  async deleteLearningModule(moduleId: string): Promise<ApiResponse<void>> {
    return this.delete(`/content/modules/${moduleId}`);
  }

  // Get user's learning progress for all modules
  async getUserProgress(): Promise<ApiResponse<UserProgress[]>> {
    return this.get('/progress');
  }

  // Get user's progress for a specific module
  async getModuleProgress(moduleId: string): Promise<ApiResponse<UserProgress>> {
    return this.get(`/progress/${moduleId}`);
  }

  // Update user's progress for a specific module
  async updateProgress(progressData: ProgressUpdateRequest): Promise<ApiResponse<UserProgress>> {
    return this.post('/progress', progressData);
  }

  // Get user's learning statistics and analytics
  async getLearningStats(): Promise<ApiResponse<LearningStats>> {
    return this.get('/progress/stats');
  }

  // Get personalized module recommendations
  async getModuleRecommendations(): Promise<ApiResponse<ModuleRecommendation[]>> {
    return this.get('/progress/recommendations');
  }

  // Bookmark/unbookmark a module
  async toggleModuleBookmark(moduleId: string, bookmarked: boolean): Promise<ApiResponse<UserProgress>> {
    return this.post('/progress', {
      module_id: moduleId,
      status: bookmarked ? 'bookmarked' : 'not_started'
    });
  }

  // Mark module as completed
  async completeModule(moduleId: string, timeSpent?: number, notes?: string): Promise<ApiResponse<UserProgress>> {
    return this.post('/progress', {
      module_id: moduleId,
      status: 'completed',
      progress_percentage: 100,
      time_spent_minutes: timeSpent,
      notes
    });
  }

  // Get featured modules
  async getFeaturedModules(): Promise<ApiResponse<ModulesResponse>> {
    return this.getLearningModules({ is_featured: true, limit: 10 });
  }

  // Search modules by keyword
  async searchModules(query: string): Promise<ApiResponse<ModulesResponse>> {
    return this.getLearningModules({ search: query });
  }

  // Get modules by category
  async getModulesByCategory(categoryId: string): Promise<ApiResponse<ModulesResponse>> {
    return this.getLearningModules({ category_id: categoryId });
  }

  // Get popular modules (by view count)
  async getPopularModules(): Promise<ApiResponse<LearningModule[]>> {
    return this.get('/content/modules?sort=view_count&order=desc&limit=10');
  }

  // Get recent modules
  async getRecentModules(): Promise<ApiResponse<LearningModule[]>> {
    return this.get('/content/modules?sort=created_at&order=desc&limit=10');
  }

  // Get user statistics (for UserStats component)
  async getUserStats() {
    return this.get('/user/stats');
  }

  // ================================
  // COURSE MANAGEMENT METHODS
  // ================================

  // Get all courses with filtering
  async getCourses(params?: {
    category_id?: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    featured?: boolean;
    search?: string;
    status?: string;
    author_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    return this.get(`/api-proxy/lms/courses${queryString ? `?${queryString}` : ''}`);
  }

  // Get a specific course by ID
  async getCourse(courseId: string): Promise<ApiResponse<any>> {
    return this.get(`/api-proxy/lms/courses/${courseId}`);
  }

  // Create a new course (moderator+)
  async createCourse(courseData: {
    title: string;
    description: string;
    overview?: string;
    category_id?: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    estimated_duration_hours?: number;
    prerequisites?: string[];
    learning_outcomes?: string[];
    status?: 'draft' | 'published' | 'archived';
    featured?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.post('/api-proxy/lms/courses', courseData);
  }

  // Update a course (author or moderator+)
  async updateCourse(courseId: string, courseData: {
    title?: string;
    description?: string;
    overview?: string;
    category_id?: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    estimated_duration_hours?: number;
    prerequisites?: string[];
    learning_outcomes?: string[];
    status?: 'draft' | 'published' | 'archived';
    featured?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.put(`/api-proxy/lms/courses/${courseId}`, courseData);
  }

  // Delete a course (author or admin only)
  async deleteCourse(courseId: string): Promise<ApiResponse<any>> {
    return this.delete(`/api-proxy/lms/courses/${courseId}`);
  }

  // Get featured courses
  async getFeaturedCourses(): Promise<ApiResponse<any>> {
    return this.getCourses({ featured: true, limit: 10 });
  }

  // Search courses by keyword
  async searchCourses(query: string): Promise<ApiResponse<any>> {
    return this.getCourses({ search: query });
  }

  // Get courses by category
  async getCoursesByCategory(categoryId: string): Promise<ApiResponse<any>> {
    return this.getCourses({ category_id: categoryId });
  }

  // Get courses by author
  async getCoursesByAuthor(authorId: string): Promise<ApiResponse<any>> {
    return this.getCourses({ author_id: authorId });
  }

  // ================================
  // COURSE-MODULE RELATIONSHIP METHODS
  // ================================

  // Get modules for a specific course
  async getCourseModules(courseId: string): Promise<ApiResponse<any>> {
    return this.get(`/api-proxy/lms/courses/${courseId}/modules`);
  }

  // Add a module to a course
  async addModuleToCourse(courseId: string, moduleData: {
    module_id: string;
    order_index?: number;
    is_required?: boolean;
  }): Promise<ApiResponse<any>> {
    return this.post(`/api-proxy/lms/courses/${courseId}/modules`, moduleData);
  }

  // Remove a module from a course
  async removeModuleFromCourse(courseId: string, moduleId: string): Promise<ApiResponse<any>> {
    return this.delete(`/api-proxy/lms/courses/${courseId}/modules/${moduleId}`);
  }

  // Update module settings within a course
  async updateCourseModule(courseId: string, moduleId: string, moduleData: {
    is_required?: boolean;
    order_index?: number;
  }): Promise<ApiResponse<any>> {
    return this.put(`/api-proxy/lms/courses/${courseId}/modules/${moduleId}`, moduleData);
  }

  // Reorder modules within a course
  async reorderCourseModules(courseId: string, moduleOrders: Array<{
    module_id: string;
    order_index: number;
  }>): Promise<ApiResponse<any>> {
    return this.put(`/api-proxy/lms/courses/${courseId}/modules/order`, {
      module_orders: moduleOrders
    });
  }

  // ================================
  // COURSE ENROLLMENT METHODS
  // ================================

  // Get user's enrollments
  async getUserEnrollments(params?: {
    status?: 'active' | 'completed' | 'dropped' | 'suspended';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    return this.get(`/api-proxy/lms/enrollments${queryString ? `?${queryString}` : ''}`);
  }

  // Get enrollment details for a specific course
  async getCourseEnrollment(courseId: string): Promise<ApiResponse<any>> {
    return this.get(`/api-proxy/lms/courses/${courseId}/enrollment`);
  }

  // Enroll in a course
  async enrollInCourse(courseId: string): Promise<ApiResponse<any>> {
    return this.post(`/api-proxy/lms/courses/${courseId}/enroll`, {});
  }

  // Update enrollment status
  async updateEnrollment(courseId: string, enrollmentData: {
    status?: 'active' | 'completed' | 'dropped' | 'suspended';
    progress_percentage?: number;
  }): Promise<ApiResponse<any>> {
    return this.put(`/api-proxy/lms/courses/${courseId}/enrollment`, enrollmentData);
  }

  // Drop from course (user action)
  async dropFromCourse(courseId: string): Promise<ApiResponse<any>> {
    return this.updateEnrollment(courseId, { status: 'dropped' });
  }

  // Mark course as completed (moderator/author action)
  async markCourseCompleted(courseId: string): Promise<ApiResponse<any>> {
    return this.updateEnrollment(courseId, { status: 'completed' });
  }

  // Get course enrollment statistics (moderators only)
  async getCourseEnrollmentStats(courseId: string): Promise<ApiResponse<any>> {
    return this.get(`/api-proxy/lms/courses/${courseId}/enrollment-stats`);
  }

  // Get all enrollments for a course (moderators only)
  async getCourseEnrollments(courseId: string, params?: {
    status?: 'active' | 'completed' | 'dropped' | 'suspended';
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const queryString = queryParams.toString();
    return this.get(`/api-proxy/lms/courses/${courseId}/enrollments${queryString ? `?${queryString}` : ''}`);
  }

  // Get active enrollments
  async getActiveEnrollments(): Promise<ApiResponse<any>> {
    return this.getUserEnrollments({ status: 'active' });
  }

  // Get completed enrollments
  async getCompletedEnrollments(): Promise<ApiResponse<any>> {
    return this.getUserEnrollments({ status: 'completed' });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;

// Export specific methods for convenience
export const {
  get,
  post,
  put,
  patch,
  delete: del,
  getUsers,
  getUserById,
  updateUserStatus,
  updateUserRole,
  createUser,
  getDashboardStats,
  getLogs,
  health,
  healthDetailed,
  login,
  register,
  refreshToken,
  getCurrentUser,
  logout,
  sendMessage,
  saveAssistantMessage,
  getConversations,
  getConversationMessages,
  deleteConversation,
  updateConversationTitle,
  generateAIResponse,
  // LMS Methods
  getModuleCategories,
  getLearningModules,
  getLearningModule,
  createLearningModule,
  updateLearningModule,
  deleteLearningModule,
  getUserProgress,
  getModuleProgress,
  updateProgress,
  getLearningStats,
  getModuleRecommendations,
  toggleModuleBookmark,
  completeModule,
  getFeaturedModules,
  searchModules,
  getModulesByCategory,
  getPopularModules,
  getRecentModules,
  getUserStats,
  // Course Methods
  getCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  getFeaturedCourses,
  searchCourses,
  getCoursesByCategory,
  getCoursesByAuthor,
  // Course-Module Relationship Methods
  getCourseModules,
  addModuleToCourse,
  removeModuleFromCourse,
  updateCourseModule,
  reorderCourseModules,
  // Course Enrollment Methods
  getUserEnrollments,
  getCourseEnrollment,
  enrollInCourse,
  updateEnrollment,
  dropFromCourse,
  markCourseCompleted,
  getCourseEnrollmentStats,
  getCourseEnrollments,
  getActiveEnrollments,
  getCompletedEnrollments,
} = apiClient;
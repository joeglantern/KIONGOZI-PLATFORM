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
   * Get authentication token from various sources
   */
  private getAuthToken(): string | null {
    // Try to get token from window object (set by auth components)
    if (typeof window !== 'undefined') {
      const token = (window as any).supabaseToken;
      if (token) return token;
    }

    // Try to get from localStorage with multiple key formats
    if (typeof window !== 'undefined' && window.localStorage) {
      // Try Supabase's standard format first
      const supabaseToken = localStorage.getItem('sb-jdncfyagppohtksogzkx-auth-token');
      if (supabaseToken) {
        try {
          const parsed = JSON.parse(supabaseToken);
          if (parsed.access_token) return parsed.access_token;
        } catch {}
      }

      // Fallback to direct token storage
      const directToken = localStorage.getItem('supabase_token') || localStorage.getItem('token');
      if (directToken) return directToken;
    }

    return null;
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
    if (!token) {
      console.error('❌ [ApiClient] CRITICAL: No authentication token found!', {
        hasWindow: typeof window !== 'undefined',
        windowToken: typeof window !== 'undefined' ? !!(window as any).supabaseToken : false,
        hasLocalStorage: typeof window !== 'undefined' && !!window.localStorage,
        supabaseStorageExists: typeof window !== 'undefined' && !!localStorage.getItem('sb-jdncfyagppohtksogzkx-auth-token'),
        endpoint,
        url
      });
    } else {
      console.log('✅ [ApiClient] Using token for request to', endpoint, {
        hasToken: true,
        tokenPrefix: token.slice(0, 10) + '...',
        url
      });
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kiongozi-Frontend/1.0',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('🌐 [ApiClient] Making request:', {
      url,
      method: options.method || 'GET',
      hasAuth: !!token,
      headers: Object.keys(headers)
    });

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📡 [ApiClient] Response received:', {
        url,
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type')
      });

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

      console.log('📋 [ApiClient] Parsed response data:', data);

      if (!response.ok) {
        console.error('❌ [ApiClient] Request failed:', {
          status: response.status,
          error: data.error || `HTTP ${response.status}`,
          details: data.details
        });
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
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
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
  sendMessage,
  saveAssistantMessage,
  getConversations,
  getConversationMessages,
  deleteConversation,
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
} = apiClient;
/**
 * Mobile API Client for Kiongozi Platform
 * This mirrors the web app's API client but adapted for React Native
 */
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://kiongozi-api.onrender.com';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
}

// Learning Statistics Types
export interface CategoryStats {
  id: string;
  name: string;
  color: string;
  icon: string;
  total: number;
  completed: number;
  in_progress: number;
}

export interface LearningStatsOverview {
  total_modules_started: number;
  completed_modules: number;
  in_progress_modules: number;
  bookmarked_modules: number;
  completion_rate: number;
  average_progress: number;
  total_time_spent_minutes: number;
  current_streak_days: number;
}

export interface LearningStats {
  overview: LearningStatsOverview;
  categories: CategoryStats[];
  recent_activity: any[];
}


class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from secure storage
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await SecureStore.getItemAsync('supabase_token');
      return token;
    } catch (error) {
      console.warn('Failed to get auth token:', error);
      return null;
    }
  }

  /**
   * Save authentication token to secure storage
   */
  async saveAuthToken(token: string): Promise<void> {
    try {
      await SecureStore.setItemAsync('supabase_token', token);
    } catch (error) {
      console.warn('Failed to save auth token:', error);
    }
  }

  /**
   * Remove authentication token from secure storage
   */
  async removeAuthToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('supabase_token');
    } catch (error) {
      console.warn('Failed to remove auth token:', error);
    }
  }

  /**
   * Make HTTP request with proper headers and error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kiongozi-Mobile/1.0',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const responseText = await response.text();

      // Only log details for errors or when debugging
      if (!response.ok) {
        console.error(`API Error - ${options.method || 'GET'} ${url}`);
        console.error(`Status: ${response.status}`);
        console.error('Response:', responseText);
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        return {
          success: false,
          error: 'Invalid JSON response',
          details: responseText,
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          details: data.details || responseText,
        };
      }

      // Ensure we always return a consistent structure
      if (data.success !== undefined) {
        return data;
      } else {
        // If the API doesn't return a success field, wrap it
        return {
          success: true,
          data: data,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Network error',
        details: error.message,
      };
    }
  }

  /**
   * Chat Methods - Exact same as web app
   */

  // Send user message to chat
  async sendMessage(text: string, conversation_id?: string) {
    return this.request('/api/v1/chat/message', {
      method: 'POST',
      body: JSON.stringify({ text, conversation_id })
    });
  }

  // Save assistant message to conversation
  async saveAssistantMessage(text: string, conversation_id: string, type?: 'chat' | 'research', research_data?: any) {
    return this.request('/api/v1/chat/message/assistant', {
      method: 'POST',
      body: JSON.stringify({ text, conversation_id, type, research_data })
    });
  }

  // Get user's conversations
  async getConversations(params?: {
    limit?: number;
    offset?: number;
    q?: string;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/chat/conversations${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  // Get conversation messages
  async getConversationMessages(conversationId: string, params?: {
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/chat/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  // Delete conversation
  async deleteConversation(conversationId: string) {
    return this.request(`/api/v1/chat/conversations/${conversationId}`, { method: 'DELETE' });
  }

  // Get user statistics
  async getUserStats() {
    return this.request('/api/v1/user/stats', { method: 'GET' });
  }

  // Delete user account
  async deleteAccount() {
    return this.request('/api/v1/user/account', { method: 'DELETE' });
  }

  // Generate AI response via backend
  async generateAIResponse(userMessage: string, conversationId?: string, type: 'chat' | 'research' = 'chat') {
    return this.request('/api/v1/chat/ai-response', {
      method: 'POST',
      body: JSON.stringify({
        message: userMessage,
        conversation_id: conversationId,
        type
      })
    });
  }

  // Generate AI response with streaming
  async generateAIResponseStream(
    userMessage: string,
    conversationId: string | undefined,
    type: 'chat' | 'research' = 'chat',
    onChunk: (chunk: string) => void,
    onComplete: (metadata: any) => void,
    onError: (error: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const url = `${this.baseURL}/api/v1/chat/ai-response/stream`;
    const token = await this.getAuthToken();

    if (!token) {
      onError('No authentication token available');
      return;
    }

    try {
      // Use XMLHttpRequest for SSE streaming (works in React Native)
      const xhr = new XMLHttpRequest();

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      let lastProcessedLength = 0;
      let hasCompleted = false;

      xhr.onprogress = () => {
        if (hasCompleted) return;

        const responseText = xhr.responseText || '';
        const newData = responseText.slice(lastProcessedLength);
        if (!newData) return;

        lastProcessedLength = responseText.length;
        const lines = newData.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.error) {
                hasCompleted = true;
                onError(data.error);
                return;
              }

              if (data.done) {
                hasCompleted = true;
                onComplete(data.metadata || {});
              } else if (data.content) {
                onChunk(data.content);
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status !== 200) {
          let errorMessage = `HTTP ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || errorMessage;
          } catch {
            // Use status code if can't parse
          }
          onError(errorMessage);
        } else if (!hasCompleted) {
          // Stream ended without completion message
          onComplete({});
        }
      };

      xhr.onerror = () => {
        onError('Network request failed');
      };

      xhr.onabort = () => {
        console.log('Stream aborted by user');
      };

      xhr.open('POST', url);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('User-Agent', 'Kiongozi-Mobile/1.0');

      xhr.send(JSON.stringify({
        message: userMessage,
        conversation_id: conversationId,
        type
      }));

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
        return;
      }
      onError(error.message || 'Streaming error');
    }
  }

  /**
   * LMS Methods - Learning Management System Integration
   */

  // Get learning module categories
  async getModuleCategories() {
    return this.request('/api/v1/content/categories', { method: 'GET' });
  }

  // Get learning modules with filtering
  async getModules(params?: {
    category_id?: string;
    difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
    featured?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/content/modules${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  // Get a specific module by ID
  async getModule(moduleId: string) {
    return this.request(`/api/v1/content/modules/${moduleId}`, { method: 'GET' });
  }

  // Get user's learning progress
  async getUserProgress(params?: {
    module_id?: string;
    status?: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/progress${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  // Update progress for a specific module
  async updateProgress(moduleId: string, data: {
    status?: 'not_started' | 'in_progress' | 'completed' | 'bookmarked';
    progress_percentage?: number;
    time_spent_minutes?: number;
    notes?: string;
  }) {
    return this.request(`/api/v1/progress/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Get learning statistics/overview
  async getLearningStats() {
    return this.request('/api/v1/progress/stats', { method: 'GET' });
  }

  // Search modules (enhanced search with AI)
  async searchModules(query: string, params?: {
    category_id?: string;
    difficulty_level?: string;
    limit?: number;
  }) {
    const searchParams = { search: query, ...params };
    const queryString = new URLSearchParams(searchParams as any).toString();
    return this.request(`/api/v1/content/modules?${queryString}`, { method: 'GET' });
  }

  // Get featured/recommended modules
  async getFeaturedModules(limit: number = 6) {
    return this.request(`/api/v1/content/modules?featured=true&limit=${limit}`, { method: 'GET' });
  }

  // Bookmark/unbookmark a module
  async bookmarkModule(moduleId: string, bookmarked: boolean = true) {
    return this.updateProgress(moduleId, {
      status: bookmarked ? 'bookmarked' : 'not_started'
    });
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
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/content/courses${queryString ? `?${queryString}` : ''}`;
    console.log('🔍 getCourses URL:', `${this.baseURL}${endpoint}`);
    console.log('🔍 getCourses params:', JSON.stringify(params));
    const result = await this.request(endpoint, { method: 'GET' });
    console.log('🔍 getCourses result:', JSON.stringify(result).substring(0, 200));
    return result;
  }

  // Get a specific course by ID
  async getCourse(courseId: string) {
    return this.request(`/api/v1/content/courses/${courseId}`, { method: 'GET' });
  }

  // Get featured courses
  async getFeaturedCourses(limit: number = 6) {
    return this.request(`/api/v1/content/courses?featured=true&limit=${limit}`, { method: 'GET' });
  }

  // Search courses by keyword
  async searchCourses(query: string, params?: {
    category_id?: string;
    difficulty_level?: string;
    limit?: number;
  }) {
    const searchParams = { search: query, ...params };
    const queryString = new URLSearchParams(searchParams as any).toString();
    return this.request(`/api/v1/content/courses?${queryString}`, { method: 'GET' });
  }

  // Get courses by category
  async getCoursesByCategory(categoryId: string) {
    return this.request(`/api/v1/content/courses?category_id=${categoryId}`, { method: 'GET' });
  }

  // ================================
  // COURSE ENROLLMENT METHODS
  // ================================

  // Get user's course enrollments
  async getUserEnrollments(params?: {
    status?: 'active' | 'completed' | 'dropped' | 'suspended';
    limit?: number;
    offset?: number;
  }) {
    const queryString = new URLSearchParams(params as any).toString();
    const endpoint = `/api/v1/content/enrollments${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint, { method: 'GET' });
  }

  // Get enrollment details for a specific course
  async getCourseEnrollment(courseId: string) {
    return this.request(`/api/v1/content/courses/${courseId}/enrollment`, { method: 'GET' });
  }

  // Enroll in a course
  async enrollInCourse(courseId: string) {
    return this.request(`/api/v1/content/courses/${courseId}/enroll`, { method: 'POST' });
  }

  // Update enrollment status
  async updateEnrollment(courseId: string, data: {
    status?: 'active' | 'completed' | 'dropped' | 'suspended';
    progress_percentage?: number;
  }) {
    return this.request(`/api/v1/content/courses/${courseId}/enrollment`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Drop from course
  async dropFromCourse(courseId: string) {
    return this.updateEnrollment(courseId, { status: 'dropped' });
  }

  // Get active enrollments
  async getActiveEnrollments() {
    return this.getUserEnrollments({ status: 'active' });
  }

  // Get completed enrollments
  async getCompletedEnrollments() {
    return this.getUserEnrollments({ status: 'completed' });
  }

  // ================================
  // COURSE-MODULE RELATIONSHIP METHODS
  // ================================

  // Get modules for a specific course
  async getCourseModules(courseId: string) {
    return this.request(`/api/v1/content/courses/${courseId}/modules`, { method: 'GET' });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
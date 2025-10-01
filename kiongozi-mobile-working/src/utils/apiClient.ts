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
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
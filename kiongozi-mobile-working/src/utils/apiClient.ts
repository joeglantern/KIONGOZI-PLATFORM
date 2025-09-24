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
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
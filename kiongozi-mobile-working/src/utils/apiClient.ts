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
  // In-memory fallback for tokens exceeding SecureStore's 2KB limit
  private tokenMemCache: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token (SecureStore with in-memory fallback)
   */
  private async getAuthToken(): Promise<string | null> {
    if (this.tokenMemCache) return this.tokenMemCache;
    try {
      const token = await SecureStore.getItemAsync('supabase_token');
      if (token) this.tokenMemCache = token;
      return token;
    } catch {
      return null;
    }
  }

  /**
   * Save authentication token (SecureStore with in-memory fallback for large tokens)
   */
  async saveAuthToken(token: string): Promise<void> {
    this.tokenMemCache = token;
    try {
      await SecureStore.setItemAsync('supabase_token', token);
    } catch {
      // SecureStore 2KB limit exceeded — token cached in memory for this session
    }
  }

  /**
   * Remove authentication token from secure storage
   */
  async removeAuthToken(): Promise<void> {
    this.tokenMemCache = null;
    try {
      await SecureStore.deleteItemAsync('supabase_token');
    } catch {}
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

      if (response.status === 429) {
        return {
          success: false,
          error: 'Too many requests. Please wait a moment and try again.',
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
    return this.request(endpoint, { method: 'GET' });
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

  // ================================
  // SOCIAL PLATFORM METHODS
  // ================================

  /** Get personal feed (paginated, cursor-based) */
  async getFeed(cursor?: string) {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/api/v1/social/feed${params}`, { method: 'GET' });
  }

  /** Get explore/public feed */
  async getExploreFeed(cursor?: string) {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/api/v1/social/explore${params}`, { method: 'GET' });
  }

  /** Get a single post by ID */
  async getPost(postId: string) {
    return this.request(`/api/v1/social/posts/${postId}`, { method: 'GET' });
  }

  /** Create a new post */
  async createPost(content: string, media?: any[], parentPostId?: string, visibility: 'public' | 'followers' = 'public') {
    return this.request('/api/v1/social/posts', {
      method: 'POST',
      body: JSON.stringify({ content, media, parent_post_id: parentPostId, visibility })
    });
  }

  /** Edit a post (content and/or visibility) */
  async editPost(postId: string, content: string, visibility?: 'public' | 'followers') {
    return this.request(`/api/v1/social/posts/${postId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content, visibility })
    });
  }

  /** Delete a post */
  async deletePost(postId: string) {
    return this.request(`/api/v1/social/posts/${postId}`, { method: 'DELETE' });
  }

  /** Like or unlike a post (toggle) */
  async likePost(postId: string) {
    return this.request(`/api/v1/social/posts/${postId}/like`, { method: 'POST' });
  }

  /** Repost a post */
  async repostPost(postId: string, content?: string) {
    return this.request(`/api/v1/social/posts/${postId}/repost`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  /** Reply to a post */
  async replyToPost(postId: string, content: string, media?: any[]) {
    return this.request(`/api/v1/social/posts/${postId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ content, media })
    });
  }

  /** Get replies for a post */
  async getPostReplies(postId: string, cursor?: string) {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/api/v1/social/posts/${postId}/replies${params}`, { method: 'GET' });
  }

  /** Follow a user */
  async followUser(userId: string) {
    return this.request(`/api/v1/social/follow/${userId}`, { method: 'POST' });
  }

  /** Unfollow a user */
  async unfollowUser(userId: string) {
    return this.request(`/api/v1/social/follow/${userId}`, { method: 'DELETE' });
  }

  /** Get own profile (by auth token — no username needed) */
  async getMyProfile() {
    return this.request('/api/v1/social/profile/me', { method: 'GET' });
  }

  /** Get a public profile by username */
  async getPublicProfile(username: string) {
    return this.request(`/api/v1/social/users/${username}`, { method: 'GET' });
  }

  /** Get a user's posts by username */
  async getUserPosts(username: string, cursor?: string) {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/api/v1/social/users/${username}/posts${params}`, { method: 'GET' });
  }

  /** Update own profile (multipart/form-data for avatar upload) */
  async updateProfile(formData: FormData) {
    const url = `${this.baseURL}/api/v1/social/profile`;
    const token = await this.getAuthToken();
    const headers: HeadersInit = { 'User-Agent': 'Kiongozi-Mobile/1.0' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
      const response = await fetch(url, { method: 'PATCH', headers, body: formData });
      const data = await response.json();
      return data;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /** Get trending hashtags + posts */
  async getTrending() {
    return this.request('/api/v1/social/trending', { method: 'GET' });
  }

  /** Search posts and users */
  async searchSocial(query: string) {
    return this.request(`/api/v1/social/search?q=${encodeURIComponent(query)}`, { method: 'GET' });
  }

  // ================================
  // MEDIA UPLOAD METHODS
  // ================================

  /** Upload a file (image or video) using XMLHttpRequest — required for React Native multipart/form-data */
  async uploadFile(endpoint: string, formData: FormData): Promise<{ success: boolean; data?: any; error?: string }> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('User-Agent', 'Kiongozi-Mobile/1.0');
      // Do NOT set Content-Type — XHR sets it automatically with the correct multipart boundary

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch {
          resolve({ success: false, error: `Server error (${xhr.status})` });
        }
      };

      xhr.onerror = () => resolve({ success: false, error: 'Network error — could not reach server' });
      xhr.ontimeout = () => resolve({ success: false, error: 'Upload timed out' });
      xhr.timeout = 60000; // 60 s

      xhr.send(formData);
    });
  }

  // ================================
  // DIRECT MESSAGES METHODS
  // ================================

  /** List DM conversations */
  async getDMConversations() {
    return this.request('/api/v1/dm/conversations', { method: 'GET' });
  }

  /** Start a new DM conversation */
  async startDMConversation(recipientId: string) {
    return this.request('/api/v1/dm/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId })
    });
  }

  /** Get messages in a DM conversation */
  async getDMMessages(conversationId: string, cursor?: string) {
    const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/api/v1/dm/conversations/${conversationId}${params}`, { method: 'GET' });
  }

  /** Send a DM message */
  async sendDM(conversationId: string, content: string, mediaUrl?: string, mediaType?: string) {
    return this.request(`/api/v1/dm/conversations/${conversationId}`, {
      method: 'POST',
      body: JSON.stringify({ content, media_url: mediaUrl, media_type: mediaType })
    });
  }

  /** Mark DM conversation as read */
  async markDMRead(conversationId: string) {
    return this.request(`/api/v1/dm/conversations/${conversationId}/read`, { method: 'PUT' });
  }

  // ================================
  // NOTIFICATIONS METHODS
  // ================================

  async getNotifications(params?: { limit?: number; offset?: number; unread_only?: boolean }) {
    const filtered = params
      ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
      : {};
    const qs = new URLSearchParams(filtered).toString();
    return this.request(`/api/v1/notifications${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }

  async markNotificationRead(notificationId: string) {
    return this.request(`/api/v1/notifications/${notificationId}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/api/v1/notifications/read-all', { method: 'PUT' });
  }

  // ================================
  // FOLLOWERS / FOLLOWING
  // ================================

  async checkUsername(username: string): Promise<{ available: boolean; reason?: string }> {
    const res = await this.request(`/api/v1/social/username/check/${encodeURIComponent(username)}`, { method: 'GET' });
    return res as { available: boolean; reason?: string };
  }

  async getFollowers(userId: string) {
    return this.request(`/api/v1/social/followers/${userId}`, { method: 'GET' });
  }

  async getFollowing(userId: string) {
    return this.request(`/api/v1/social/following/${userId}`, { method: 'GET' });
  }

  /** Get "For You" scored feed (offset-based pagination) */
  async getForYouFeed(offset = 0) {
    return this.request(`/api/v1/social/for-you?offset=${offset}`, { method: 'GET' });
  }

  /** Toggle bookmark on a post */
  async bookmarkPost(postId: string) {
    return this.request(`/api/v1/social/posts/${postId}/bookmark`, { method: 'POST' });
  }

  /** Get bookmarked posts (cursor-based) */
  async getBookmarks(cursor?: string) {
    const p = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
    return this.request(`/api/v1/social/bookmarks${p}`, { method: 'GET' });
  }

  // ================================
  // PUSH NOTIFICATIONS
  // ================================

  /** Register an Expo push token for the current user */
  async registerPushToken(token: string, platform?: string) {
    return this.request('/api/v1/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }

  /** Unregister an Expo push token for the current user */
  async unregisterPushToken(token: string) {
    return this.request('/api/v1/notifications/push-token', {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    });
  }

  /** Get posts for a user filtered by type: 'posts' | 'replies' | 'media' */
  async getUserPostsByType(username: string, type: 'posts' | 'replies' | 'media', cursor?: string) {
    const params = new URLSearchParams({ type });
    if (cursor) params.set('cursor', cursor);
    return this.request(`/api/v1/social/users/${username}/posts?${params.toString()}`, { method: 'GET' });
  }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient;
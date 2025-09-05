/**
 * Centralized API Client for Kiongozi Platform - Admin Panel Version
 * This file provides a consistent way to communicate with the API server
 * and handles authentication, error handling, and response formatting.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3002/api/v1';

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

class AdminApiClient {
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

    // Try to get from localStorage as fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem('supabase_token') || localStorage.getItem('sb-jdncfyagppohtksogzkx-auth-token');
      if (token) {
        try {
          const parsed = JSON.parse(token);
          return parsed.access_token;
        } catch {
          return token;
        }
      }
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

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kiongozi-Admin/1.0',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

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
   * Test connectivity (useful for debugging)
   */
  async testConnection() {
    return this.health();
  }
}

// Create singleton instance
const adminApiClient = new AdminApiClient();

export default adminApiClient;

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
  testConnection,
} = adminApiClient;
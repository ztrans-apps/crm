// API client with interceptors
import { createClient } from '@/lib/supabase/client'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  logout?: boolean
}

export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: any
  requireAuth?: boolean
}

/**
 * API client with automatic auth token injection
 */
export class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Get auth token from Supabase
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token || null
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  /**
   * Make API request
   */
  async request<T = any>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const {
        method = 'GET',
        headers = {},
        body,
        requireAuth = true,
      } = config

      // Build URL
      const url = `${this.baseUrl}${endpoint}`

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      }

      // Add auth token if required
      if (requireAuth) {
        const token = await this.getAuthToken()
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`
        }
      }

      // Make request
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body ? JSON.stringify(body) : undefined,
      })

      // Parse response
      const data = await response.json()

      // Handle logout
      if (data.logout) {
        // Trigger logout
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
      }

      return data
    } catch (error: any) {
      console.error('API request error:', error)
      return {
        success: false,
        error: error.message || 'Request failed',
      }
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' })
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body })
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body })
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string, config?: Omit<ApiRequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' })
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, body?: any, config?: Omit<ApiRequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

/**
 * Helper function for API calls
 */
export async function apiCall<T = any>(
  endpoint: string,
  config?: ApiRequestConfig
): Promise<T> {
  const response = await apiClient.request<T>(endpoint, config)
  
  if (!response.success) {
    throw new Error(response.error || 'API call failed')
  }
  
  return response.data as T
}

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Helper to get token from zustand store
const getToken = () => {
  if (typeof window === 'undefined') return null;
  
  // Try to get from zustand store persisted in localStorage
  try {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
  } catch (e) {
    console.warn('Failed to parse auth storage:', e);
  }
  
  return null;
};

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = getToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login on 401
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; verification_method: 'otp' | 'token' }) =>
    api.post('/auth/register', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post('/auth/verify-otp', data),
  
  verifyToken: (token: string) =>
    api.get(`/auth/verify?token=${token}`),
  
  resendVerification: (data: { email: string; verification_method?: 'otp' | 'token' }) =>
    api.post('/auth/resend-verification', data),
  
  forgotPassword: (data: { email: string }) =>
    api.post('/auth/forgot-password', data),
  
  resetPassword: (data: { token: string; new_password: string }) =>
    api.post('/auth/reset-password', data),
  
  getProfile: () =>
    api.get('/auth/me'),
  
  updateProfile: (data: { email?: string; is_active?: boolean }) =>
    api.put('/auth/me', data),
  
  changePassword: (data: FormData) =>
    api.post('/auth/change-password', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  deleteAccount: (data: FormData) =>
    api.delete('/auth/me', {
      data,
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  
  logout: () =>
    api.post('/auth/logout'),
};

// Chat API
export const chatAPI = {
  sendMessage: (data: {
    message: string;
    session_id?: string;
    conversation_type?: string;
    max_tokens?: number;
    temperature?: number;
    model?: string;
  }) =>
    api.post('/chat/', data, {
      timeout: 120000, // 2 minutes for AI responses
    }),
  
  // Streaming response with Server-Sent Events
  streamMessage: async (
    data: {
      message: string;
      session_id?: string;
      conversation_type?: string;
      max_tokens?: number;
      temperature?: number;
      model?: string;
    },
    onChunk: (chunk: string, accumulated: string) => void,
    onComplete: (data: any) => void,
    onError: (error: string) => void
  ) => {
    const token = getToken();
    if (!token) {
      onError('Authentication required');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'chunk') {
              onChunk(data.content, data.accumulated);
            } else if (data.type === 'complete') {
              onComplete(data);
            } else if (data.type === 'error') {
              onError(data.error);
            } else if (data.type === 'session_id') {
              // Handle session_id if needed
            }
          }
        }
      }
    } catch (error: any) {
      onError(error.message || 'Streaming failed');
    }
  },
  
  sendMessageWithFiles: (formData: FormData) =>
    api.post('/chat/with-files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 minutes for AI responses with files
    }),
  
  getHistory: (sessionId: string, limit: number = 50) =>
    api.get(`/chat/history/${sessionId}?limit=${limit}`),
  
  getSessions: (params?: {
    limit?: number;
    query?: string;
    search_mode?: string;
    date_from?: string;
    date_to?: string;
    status?: string;
    sort_by?: string;
    sort_order?: string;
  }) =>
    api.get('/chat/sessions', { params }),
  
  updateSession: (sessionId: string, data: {
    title?: string;
    category?: string;
    tags?: string[];
    status?: string;
    is_pinned?: boolean;
    is_favorite?: boolean;
  }) =>
    api.put(`/chat/sessions/${sessionId}`, data),
  
  deleteSession: (sessionId: string) =>
    api.delete(`/chat/sessions/${sessionId}`),
  
  getSessionSummary: (sessionId: string) =>
    api.get(`/chat/sessions/${sessionId}/summary`),
  
  exportSession: (sessionId: string, data: {
    format: 'json' | 'txt' | 'markdown';
    include_metadata?: boolean;
  }) =>
    api.post(`/chat/sessions/${sessionId}/export`, data),
  
  bulkOperations: (data: {
    operation: 'archive' | 'delete' | 'tag' | 'untag';
    session_ids: string[];
    tag?: string;
  }) =>
    api.post('/chat/sessions/bulk', data),
  
  // Message reactions
  addReaction: (messageId: string, reactionType: string) =>
    api.post(`/chat/messages/${messageId}/reaction`, { reaction_type: reactionType }),
  
  getReactions: (messageId: string) =>
    api.get(`/chat/messages/${messageId}/reactions`),
  
  rateMessage: (messageId: string, rating: number) =>
    api.post(`/chat/messages/${messageId}/rating`, { rating }),
  
  // Conversation branching
  createBranch: (messageId: string, newContent: string, branchName?: string) =>
    api.post(`/chat/messages/${messageId}/branch`, { new_content: newContent, branch_name: branchName }),
  
  getBranches: (sessionId: string) =>
    api.get(`/chat/sessions/${sessionId}/branches`),
  
  activateBranch: (sessionId: string, branchId: string) =>
    api.put(`/chat/sessions/${sessionId}/branch/${branchId}/activate`),
};

// Health API
export const healthAPI = {
  check: () =>
    api.get('/health/'),
  
  detailed: () =>
    api.get('/health/detailed'),
  
  providers: () =>
    api.get('/health/providers'),
};

// Admin API
export const adminAPI = {
  getUsers: (params?: { skip?: number; limit?: number }) =>
    api.get('/admin/users', { params }),
  
  getUser: (userId: number) =>
    api.get(`/admin/users/${userId}`),
  
  updateUser: (userId: number, data: {
    email?: string;
    is_active?: boolean;
    is_verified?: boolean;
    is_admin?: boolean;
  }) =>
    api.put(`/admin/users/${userId}`, data),
  
  deleteUser: (userId: number) =>
    api.delete(`/admin/users/${userId}`),
  
  getStats: () =>
    api.get('/admin/stats'),
};

// Settings API
export const settingsAPI = {
  // Profile
  getProfile: () =>
    api.get('/settings/profile'),
  
  updateProfile: (data: {
    full_name?: string;
    bio?: string;
    avatar_url?: string;
    phone?: string;
    location?: string;
  }) =>
    api.put('/settings/profile', data),
  
  // Settings
  getSettings: () =>
    api.get('/settings/settings'),
  
  updateSettings: (data: {
    appearance?: {
      theme?: string;
      glass_style?: string;
      font_size?: string;
      accent_color?: string;
    };
    notifications?: {
      email_notifications?: boolean;
      chat_notifications?: boolean;
      security_alerts?: boolean;
    };
    privacy?: {
      profile_visibility?: string;
      show_online_status?: boolean;
      data_collection?: boolean;
    };
    ai_preferences?: {
      default_model?: string;
      temperature?: number;
      max_tokens?: number;
      stream_responses?: boolean;
    };
  }) =>
    api.put('/settings/settings', data),
  
  // Security
  changePassword: (data: {
    current_password: string;
    new_password: string;
  }) =>
    api.post('/settings/password/change', data),
  
  // Sessions
  getSessions: () =>
    api.get('/settings/sessions'),
  
  revokeSession: (sessionId: string) =>
    api.delete(`/settings/sessions/${sessionId}`),
  
  // Data Export
  exportData: () =>
    api.post('/settings/export/data'),
  
  // Account Deletion
  deleteAccount: (password: string) =>
    api.delete('/settings/account', {
      params: { password }
    }),
};

// Analytics API
export const analyticsAPI = {
  getSummary: (params?: {
    period?: 'day' | 'week' | 'month' | 'year';
    start_date?: string;
    end_date?: string;
  }) =>
    api.get('/analytics/summary', { params }),
  
  getModelUsage: (params?: { days?: number }) =>
    api.get('/analytics/models', { params }),
};

export default api;

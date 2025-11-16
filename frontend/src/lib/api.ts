/**
 * API Client
 * Centralized API configuration and utilities for backend integration
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const API_TIMEOUT = 120000; // 2 minutes for long-running requests

// Create axios instance for chat API
export const chatAPI: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
chatAPI.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
chatAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth state
      useAuthStore.getState().logout();
      // Optionally redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Stream chat message with SSE (Server-Sent Events)
 * Handles token-by-token streaming with memory, routing, and tool call support
 */
export async function streamChatMessage(
  message: string,
  sessionId: string | null,
  onChunk: (chunk: string, accumulated: string) => void,
  onComplete: (data: any) => void,
  onError: (error: any) => void,
  onMemories?: (memories: any[]) => void,
  onRouting?: (routing: any) => void,
  onTools?: (toolsCount: number) => void,
  onToolCall?: (toolCall: any) => void,
  onToolResult?: (toolName: string, result: any) => void,
  options?: {
    model?: string;
    temperature?: number;
    conversationType?: string;
    optimizeFor?: string;
    maxTokens?: number;
  }
): Promise<void> {
  try {
    const token = useAuthStore.getState().token;
    
    // Build request body
    const requestBody: any = {
      message,
      conversation_type: options?.conversationType || 'general',
    };
    
    if (sessionId) requestBody.session_id = sessionId;
    if (options?.model) requestBody.model = options.model;
    if (options?.temperature) requestBody.temperature = options.temperature;
    if (options?.optimizeFor) requestBody.optimize_for = options.optimizeFor;
    if (options?.maxTokens) requestBody.max_tokens = options.maxTokens;

    // Fetch with streaming
    const response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    let fullResponse = '';
    let completionData: any = {};

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // Handle different event types from streaming API
            if (parsed.type === 'chunk' && parsed.content) {
              // Token content
              fullResponse = parsed.accumulated || '';
              onChunk(parsed.content, fullResponse);
            } 
            else if (parsed.type === 'memories' && onMemories) {
              // Memory context
              onMemories(parsed.memories || []);
            } 
            else if (parsed.type === 'routing' && onRouting) {
              // Smart routing decision
              onRouting(parsed.routing);
            } 
            else if (parsed.type === 'tools_enabled' && onTools) {
              // Function calling enabled
              onTools(parsed.tools_count || 0);
            } 
            else if (parsed.type === 'tool_call' && onToolCall) {
              // Tool call initiated
              onToolCall(parsed.tool_call);
            } 
            else if (parsed.type === 'tool_result' && onToolResult) {
              // Tool execution result
              onToolResult(parsed.name, parsed.result);
            } 
            else if (parsed.type === 'complete') {
              // Streaming complete
              completionData = parsed;
            } 
            else if (parsed.type === 'error') {
              // Error occurred
              onError(new Error(parsed.error || 'Unknown streaming error'));
              return;
            }
            else if (parsed.type === 'session_id') {
              // New session created
              completionData.session_id = parsed.session_id;
            }
          } catch (e) {
            console.error('Failed to parse SSE data:', e, 'Line:', data);
          }
        }
      }
    }

    // Call completion handler
    onComplete({
      response: fullResponse,
      session_id: completionData.session_id || sessionId,
      model: completionData.model,
      provider: completionData.provider,
      usage: completionData.usage,
      routing: completionData.routing,
      toolCalls: completionData.tool_calls || 0,
    });
  } catch (error) {
    console.error('Streaming error:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
}

// API endpoints
export const api = {
  // Auth endpoints
  auth: {
    login: (email: string, password: string) =>
      chatAPI.post('/auth/login', { email, password }),
    register: (email: string, password: string, name?: string) =>
      chatAPI.post('/auth/register', { email, password, name }),
    logout: () => chatAPI.post('/auth/logout'),
    verifyToken: () => chatAPI.get('/auth/verify'),
    me: () => chatAPI.get('/auth/me'),
  },

  // Chat endpoints
  chat: {
    // Regular chat (non-streaming)
    sendMessage: (message: string, sessionId?: string, files?: File[]) => {
      const formData = new FormData();
      formData.append('message', message);
      if (sessionId) formData.append('session_id', sessionId);
      if (files) {
        files.forEach((file) => formData.append('files', file));
      }
      return chatAPI.post('/chat/with-files', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },

    // Get conversation history
    getHistory: (sessionId: string, limit: number = 50) =>
      chatAPI.get(`/chat/history/${sessionId}`, { params: { limit } }),

    // Get all sessions with filtering
    getSessions: (limit: number = 20, query?: string, status?: string) =>
      chatAPI.get('/chat/sessions', { 
        params: { 
          limit, 
          ...(query && { query }),
          ...(status && { status })
        } 
      }),

    // Create new session - Note: Sessions are created automatically by backend
    // when the user sends their first message via POST /chat
    // This returns null to indicate no session exists yet
    createSession: (title: string) => {
      // Backend creates sessions automatically on first message
      // Return null session to indicate it will be created on first message
      return Promise.resolve({
        data: null
      });
    },

    // Delete session
    deleteSession: (sessionId: string) =>
      chatAPI.delete(`/chat/sessions/${sessionId}`),

    // Update session (title/name only)
    updateSession: (sessionId: string, title: string) =>
      chatAPI.put(`/chat/sessions/${sessionId}`, { name: title }),

    // Get session summary
    getSessionSummary: (sessionId: string) =>
      chatAPI.get(`/chat/sessions/${sessionId}/summary`),

    // Export conversation
    exportSession: (sessionId: string, format: 'json' | 'txt' | 'markdown') =>
      chatAPI.post(`/chat/sessions/${sessionId}/export`, { format }),

    // Message reactions
    addReaction: (messageId: string, reactionType: string) =>
      chatAPI.post(`/chat/messages/${messageId}/reaction`, { reaction_type: reactionType }),

    getReactions: (messageId: string) =>
      chatAPI.get(`/chat/messages/${messageId}/reactions`),

    // Message rating
    rateMessage: (messageId: string, rating: number) =>
      chatAPI.post(`/chat/messages/${messageId}/rating`, { rating }),

    // Message branches
    createBranch: (messageId: string, newContent: string, branchName?: string) =>
      chatAPI.post(`/chat/messages/${messageId}/branch`, {
        new_content: newContent,
        branch_name: branchName,
      }),

    getBranches: (sessionId: string) =>
      chatAPI.get(`/chat/sessions/${sessionId}/branches`),

    activateBranch: (sessionId: string, branchId: string) =>
      chatAPI.put(`/chat/sessions/${sessionId}/branch/${branchId}/activate`),

    // Routing stats
    getRoutingStats: () =>
      chatAPI.get('/chat/routing-stats'),

    // Get available models
    getModels: () =>
      chatAPI.get('/chat/models'),
  },

  // Settings & Configuration endpoints
  settings: {
    // Get all user settings (includes AI preferences)
    getAIPreferences: () =>
      chatAPI.get('/settings/settings'),

    // Update AI preferences (updates via /settings/settings)
    updateAIPreferences: (preferences: any) =>
      chatAPI.put('/settings/settings', {
        ai_preferences: preferences
      }),

    // Get appearance settings
    getAppearance: () =>
      chatAPI.get('/settings/settings').then(res => ({ data: res.data.appearance })),

    // Update appearance settings
    updateAppearance: (settings: any) =>
      chatAPI.put('/settings/settings', { appearance: settings }),

    // Get chat settings
    getChatSettings: () =>
      chatAPI.get('/settings/settings').then(res => ({ data: res.data.chat_settings })),

    // Update chat settings
    updateChatSettings: (settings: any) =>
      chatAPI.put('/settings/settings', { chat_settings: settings }),

    // Get memory settings
    getMemorySettings: () =>
      chatAPI.get('/settings/settings').then(res => ({ data: res.data.memory_settings })),

    // Update memory settings
    updateMemorySettings: (settings: any) =>
      chatAPI.put('/settings/settings', { memory_settings: settings }),

    // Get notifications settings
    getNotifications: () =>
      chatAPI.get('/settings/settings').then(res => ({ data: res.data.notifications })),

    // Update notifications settings
    updateNotifications: (settings: any) =>
      chatAPI.put('/settings/settings', { notifications: settings }),

    // Get profile
    getProfile: () =>
      chatAPI.get('/settings/profile'),

    // Update profile
    updateProfile: (profile: any) =>
      chatAPI.put('/settings/profile', profile),

    // Change password
    changePassword: (data: { current_password: string; new_password: string }) =>
      chatAPI.post('/settings/password/change', data),
  },

  // Memory endpoints
  memory: {
    createMemory: (data: any) =>
      chatAPI.post('/memory', data),

    getMemory: (memoryId: string) =>
      chatAPI.get(`/memory/${memoryId}`),

    updateMemory: (memoryId: string, data: any) =>
      chatAPI.put(`/memory/${memoryId}`, data),

    deleteMemory: (memoryId: string) =>
      chatAPI.delete(`/memory/${memoryId}`),

    listMemories: (limit?: number, skip?: number, memoryType?: string) =>
      chatAPI.get('/memory', {
        params: {
          ...(limit && { limit }),
          ...(skip && { skip }),
          ...(memoryType && { memory_type: memoryType })
        }
      }),

    searchMemories: (data: any) =>
      chatAPI.post('/memory/search', data),

    getMemorySummary: () =>
      chatAPI.get('/memory/summary'),

    // Memory verification endpoints (Phase 1)
    verifyMemory: (memoryId: string, data: { action: 'confirm' | 'reject' | 'correct', corrected_content?: string, corrected_importance?: number, corrected_tags?: string[], feedback?: string }) =>
      chatAPI.post(`/memory/${memoryId}/verify`, data),

    getPendingMemories: (limit?: number) =>
      chatAPI.get('/memory/pending', { 
        params: { limit },
        // Add error handling for 404
        validateStatus: (status) => status < 500
      }).then(response => {
        // If 404, return empty array instead of throwing
        if (response.status === 404) {
          console.warn('Memory pending endpoint not found - feature may not be available');
          return { data: [] };
        }
        return response;
      }),

    // Memory relationships endpoints (Phase 3)
    linkMemories: (data: { source_id: string, target_id: string, relationship_type: string }) =>
      chatAPI.post('/memory/link', data),

    getRelatedMemories: (memoryId: string, relationshipType?: string, depth?: number) =>
      chatAPI.get(`/memory/${memoryId}/related`, {
        params: { 
          ...(relationshipType && { relationship_type: relationshipType }),
          ...(depth && { depth })
        }
      }),

    getMemoryGraph: (memoryId: string, maxDepth?: number) =>
      chatAPI.get(`/memory/${memoryId}/graph`, { params: { max_depth: maxDepth } }),

    // Memory conflicts endpoints (Phase 4)
    detectConflicts: (memoryId?: string) =>
      chatAPI.get('/memory/conflicts/detect', { params: { memory_id: memoryId } }),

    consolidateMemories: (memoryIds: string[]) =>
      chatAPI.post('/memory/consolidate', { memory_ids: memoryIds }),

    getConsolidationSuggestions: (limit?: number) =>
      chatAPI.get('/memory/consolidate/suggestions', { params: { limit } }),

    classifyExpiration: (memoryIds?: string[]) =>
      chatAPI.post('/memory/classify-expiration', { memory_ids: memoryIds }),

    // Memory analytics endpoints (Phase 5)
    getAnalyticsDashboard: (timeRange?: string) =>
      chatAPI.get('/memory/analytics/dashboard', { params: { time_range: timeRange } }),

    getTopMemories: (metric?: string, limit?: number) =>
      chatAPI.get('/memory/analytics/top', {
        params: {
          ...(metric && { metric }),
          ...(limit && { limit })
        }
      }),

    // Advanced features endpoints (Phase 6)
    exportMemories: (data: { format: 'json' | 'csv', include_relationships?: boolean, filter_by_status?: string, filter_by_type?: string }) =>
      chatAPI.post('/memory/export', data),

    importMemories: (data: { memories: any[], format: 'json' | 'csv', merge_strategy?: string }) =>
      chatAPI.post('/memory/import', data),

    setPrivacySettings: (data: { memory_ids: string[], is_private: boolean, shared_with?: string[] }) =>
      chatAPI.post('/memory/privacy', data),

    bulkDelete: (data: { memory_ids?: string[], filter_criteria?: any }) =>
      chatAPI.delete('/memory/bulk', { data }),
  },

  // Health check
  health: {
    check: () =>
      chatAPI.get('/health'),
  },
};

export default api;

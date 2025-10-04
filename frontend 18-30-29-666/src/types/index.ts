// Types for API responses and requests

export interface User {
  id: number;
  email: string;
  is_active: boolean;
  is_verified: boolean;
  is_admin?: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  verification_method: 'otp' | 'token';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  attachments?: FileAttachment[];
  metadata?: Record<string, any>;
  // Reactions and ratings
  reactions?: {
    like: number;
    dislike: number;
    love?: number;
    laugh?: number;
    confused?: number;
  };
  user_reaction?: string;
  rating?: number;
  // Branching
  parent_message_id?: string;
  branch_id?: string;
  is_edited?: boolean;
}

export interface FileAttachment {
  name: string;
  original_name?: string;
  size: number;
  type: string;
}

export interface ChatSession {
  session_id: string;
  title: string;
  category?: string;
  tags?: string[];
  status: 'active' | 'archived';
  is_pinned?: boolean;
  is_favorite?: boolean;
  message_count: number;
  last_activity: string;
  created_at: string;
  branches?: ConversationBranch[];
  active_branch_id?: string;
}

export interface ConversationBranch {
  branch_id: string;
  branch_name?: string;
  parent_message_id: string;
  created_at: string;
  message_count: number;
  is_active?: boolean;
}

export interface ChatResponse {
  message_id: string;
  session_id: string;
  reply: string;
  model?: string;
  provider?: string;
  request_type?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  conversation_type?: string;
}

export interface SessionSummary {
  session_id: string;
  title: string;
  message_count: number;
  total_tokens?: number;
  models_used: string[];
  providers_used: string[];
  created_at: string;
  last_activity: string;
  duration_seconds?: number;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  database?: {
    status: string;
    type?: string;
  };
  mongodb?: {
    status: string;
    ping?: boolean;
  };
  redis?: {
    status: string;
    ping?: boolean;
  };
}

export interface AdminStats {
  total_users: number;
  active_users: number;
  verified_users: number;
  total_messages: number;
  total_sessions: number;
  system_health: string;
}

export interface ErrorResponse {
  error: string;
  message: string;
  error_code?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export type ConversationType = 'general' | 'coding' | 'creative' | 'academic' | 'image' | 'text';

export type Theme = 'light' | 'dark';

export interface AppSettings {
  theme: Theme;
  sidebarCollapsed: boolean;
  autoSave: boolean;
  notifications: boolean;
}

// Analytics Types

export interface ModelUsageEntry {
  model_id: string;
  model_name: string;
  request_count: number;
  total_tokens: number;
  avg_response_time: number;
  last_used: string;
}

export interface TokenUsageEntry {
  date: string;  // YYYY-MM-DD
  total_tokens: number;
  by_model: Record<string, number>;
}

export interface ResponseTimeEntry {
  timestamp: string;
  model_id: string;
  response_time: number;
  success: boolean;
}

export interface AnalyticsSummary {
  total_requests: number;
  total_tokens: number;
  total_sessions: number;
  avg_response_time: number;
  most_used_model?: ModelUsageEntry;
  model_breakdown: ModelUsageEntry[];
  token_trends: TokenUsageEntry[];
}

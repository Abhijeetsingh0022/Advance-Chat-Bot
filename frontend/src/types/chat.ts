/**
 * Chat Type Definitions
 * Comprehensive TypeScript interfaces for the chat application
 */

// ============================================================================
// Core Message Types
// ============================================================================

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  branch_id?: string;
  attachments?: Attachment[];
  metadata?: MessageMetadata;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  type: string;
  size: number;
}

export interface MessageMetadata {
  model?: string;
  tokens?: number;
  used_memories?: Memory[];
  tool_results?: ToolResult[];
  routing?: RoutingInfo;
}

export interface Memory {
  id: string;
  content: string;
  relevance_score: number;
  created_at: string;
  memory_type?: string;
  category?: string;
  importance_score?: number;
  confidence_score?: number;
  status?: 'pending' | 'confirmed' | 'rejected' | 'corrected';
  verified_at?: string;
  contexts?: string[];
  relationships?: Array<{
    target_id: string;
    relationship_type: string;
  }>;
}

export interface ToolResult {
  tool_name: string;
  input: Record<string, any>;
  output: any;
  success: boolean;
  error?: string;
}

export interface RoutingInfo {
  model: string;
  complexity: 'simple' | 'moderate' | 'complex';
  reason: string;
  cost_estimate?: number;
}

// ============================================================================
// Session Types
// ============================================================================

export interface Session {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  model?: string;
}

export interface Branch {
  id: string;
  session_id: string;
  parent_message_id?: string;
  created_at: string;
  message_count: number;
}

// ============================================================================
// AI Model Types
// ============================================================================

export interface AIModel {
  id: string;
  name: string;
  type: 'general' | 'reasoning' | 'coding' | 'image' | 'text';
  provider: string;
  description?: string;
  max_tokens?: number;
  supports_streaming?: boolean;
  supports_function_calling?: boolean;
  cost_per_token?: number;
  context_window?: number;
  cost_per_1k_tokens?: number;
}

export type ModelType = AIModel['type'];
export type ModelProvider = 'OpenRouter' | 'Groq' | 'Google' | 'DeepSeek' | 'xAI' | 'Qwen' | 'MoonshotAI' | 'NVIDIA';

// ============================================================================
// Chat State Types
// ============================================================================

export interface ChatState {
  messages: Message[];
  currentSessionId: string | null;
  loading: boolean;
  loadingMessages: boolean;
  isTyping: boolean;
  streamingMessage: string;
  error: string | null;
}

export type ChatAction =
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; content: Partial<Message> } }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'SET_SESSION_ID'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_LOADING_MESSAGES'; payload: boolean }
  | { type: 'SET_TYPING'; payload: boolean }
  | { type: 'SET_STREAMING_MESSAGE'; payload: string }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET_CHAT' };

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamingState {
  isStreaming: boolean;
  accumulatedMessage: string;
  routingInfo: RoutingInfo | null;
  isToolCallActive: boolean;
  error: string | null;
}

export interface StreamCallbacks {
  onChunk?: (chunk: string, accumulated: string) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
  onRouting?: (routing: RoutingInfo) => void;
  onToolCall?: (toolCall: ToolCall) => void;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ============================================================================
// AI Configuration Types
// ============================================================================

export interface AIConfig {
  model: string;
  temperature: number;
  useStreaming: boolean;
  optimize_for: 'cost' | 'balanced' | 'quality';
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

// ============================================================================
// Chat Request/Response Types
// ============================================================================

export interface ChatRequest {
  message: string;
  session_id?: string;
  conversation_type?: string;
  model?: string;
  temperature?: number;
  optimize_for?: AIConfig['optimize_for'];
  files?: File[];
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  message_id: string;
  routing?: RoutingInfo;
  metadata?: MessageMetadata;
}

// ============================================================================
// Voice Control Types
// ============================================================================

export interface VoiceControlState {
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  error: string | null;
}

export interface SpeechRecognitionConfig {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  maxAlternatives?: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface UIState {
  showAIConfig: boolean;
  showThemeCustomizer: boolean;
  showSettings: boolean;
  hoveredMessage: string | null;
  favorites: Set<string>;
  selectedFiles: File[];
}

export interface KeyboardShortcut {
  key: string;
  modKey: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

// ============================================================================
// Export/Import Types
// ============================================================================

export interface ExportOptions {
  format: 'text' | 'markdown' | 'json';
  includeMetadata: boolean;
  includeTimestamps: boolean;
}

export interface ConversationExport {
  session_id: string;
  title: string;
  created_at: string;
  messages: Message[];
  metadata: {
    model: string;
    message_count: number;
    export_date: string;
  };
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ChatError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

// ============================================================================
// Analytics Types
// ============================================================================

export interface MessageAnalytics {
  response_time: number;
  token_count: number;
  cost: number;
  model_used: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseChatReturn {
  messages: Message[];
  currentSessionId: string | null;
  loading: boolean;
  loadingMessages: boolean;
  error: string | null;
  sendMessage: (request: ChatRequest) => Promise<void>;
  loadMessages: (sessionId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  regenerateResponse: (messageId: string) => Promise<void>;
  createNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
}

export interface UseStreamingReturn {
  isStreaming: boolean;
  streamingMessage: string;
  routingInfo: RoutingInfo | null;
  isToolCallActive: boolean;
  streamMessage: (request: ChatRequest, callbacks: StreamCallbacks) => Promise<void>;
  resetStreaming: () => void;
}

export interface UseVoiceControlsReturn {
  isRecording: boolean;
  isSpeaking: boolean;
  transcript: string;
  startRecording: () => void;
  stopRecording: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  error: string | null;
}

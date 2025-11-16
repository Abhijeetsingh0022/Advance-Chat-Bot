/**
 * Chat State Reducer
 * Consolidates all chat-related state management
 */

import { ChatState, ChatAction, Message } from '@/types/chat';

export const initialChatState: ChatState = {
  messages: [],
  currentSessionId: null,
  loading: false,
  loadingMessages: false,
  isTyping: false,
  streamingMessage: '',
  error: null,
};

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload,
        error: null,
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload],
        error: null,
      };

    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map((msg) =>
          msg.id === action.payload.id
            ? { ...msg, ...action.payload.content }
            : msg
        ),
        error: null,
      };

    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter((msg) => msg.id !== action.payload),
        error: null,
      };

    case 'SET_SESSION_ID':
      return {
        ...state,
        currentSessionId: action.payload,
        error: null,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_LOADING_MESSAGES':
      return {
        ...state,
        loadingMessages: action.payload,
      };

    case 'SET_TYPING':
      return {
        ...state,
        isTyping: action.payload,
        streamingMessage: action.payload ? state.streamingMessage : '',
      };

    case 'SET_STREAMING_MESSAGE':
      return {
        ...state,
        streamingMessage: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
        isTyping: false,
      };

    case 'RESET_CHAT':
      return {
        ...initialChatState,
      };

    default:
      return state;
  }
}

/**
 * useChat Hook
 * Manages all chat-related operations and state
 */

import { useReducer, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { chatAPI, api } from '@/lib/api';
import { chatReducer, initialChatState } from '@/reducers/chatReducer';
import { ChatRequest, UseChatReturn } from '@/types/chat';
import toast from 'react-hot-toast';

export function useChat(): UseChatReturn {
  const [state, dispatch] = useReducer(chatReducer, initialChatState);
  const router = useRouter();

  // Load messages for a session
  const loadMessages = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      console.error('Session ID is required');
      return;
    }

    dispatch({ type: 'SET_LOADING_MESSAGES', payload: true });
    try {
      const response = await api.chat.getHistory(sessionId);
      
      let messages = [];
      
      // Backend returns { session_id, messages: [...] }
      if (response.data?.messages && Array.isArray(response.data.messages)) {
        messages = response.data.messages;
      }
      // Or { data: messages_array }
      else if (response.data && Array.isArray(response.data)) {
        messages = response.data;
      }
      // Or { data: { data: messages_array } }
      else if (response.data?.data && Array.isArray(response.data.data)) {
        messages = response.data.data;
      }
      // Or direct array in response
      else if (Array.isArray(response)) {
        messages = response;
      }
      
      // Format messages to match expected structure
      const formattedMessages = messages.map((msg: any) => {
        const formatted = {
          id: msg.id || msg._id || `msg_${Math.random()}`,
          role: msg.role || msg.type || 'user',
          content: msg.content || msg.message || msg.text || '',
          created_at: msg.created_at || msg.timestamp || msg.createdAt || new Date().toISOString(),
          attachments: msg.attachments || msg.files || [],
          metadata: msg.metadata || msg.meta || {},
        };
        
        // Debug empty content in development
        if (process.env.NODE_ENV === 'development' && !formatted.content) {
          console.warn('Message with empty content:', {
            id: formatted.id,
            role: formatted.role,
            originalKeys: Object.keys(msg),
            originalContent: msg.content,
            originalMessage: msg.message,
            originalText: msg.text
          });
        }
        
        return formatted;
      });
      
      // Debug: Log first message to check content
      if (formattedMessages.length > 0 && process.env.NODE_ENV === 'development') {
        console.log('Loaded messages:', formattedMessages.length);
        console.log('Sample message:', {
          id: formattedMessages[0].id,
          role: formattedMessages[0].role,
          hasContent: !!formattedMessages[0].content,
          contentLength: formattedMessages[0].content?.length || 0,
          contentPreview: formattedMessages[0].content?.substring(0, 100)
        });
      }
      
      dispatch({ type: 'SET_MESSAGES', payload: formattedMessages });
      dispatch({ type: 'SET_SESSION_ID', payload: sessionId });
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load messages' });
    } finally {
      dispatch({ type: 'SET_LOADING_MESSAGES', payload: false });
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(
    async (request: ChatRequest) => {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_TYPING', payload: true });

      try {
        const response = await api.chat.sendMessage(
          request.message,
          request.session_id || state.currentSessionId,
          request.files
        );

        const { data } = response;

        // Update session ID if it's a new conversation
        if (!state.currentSessionId && data.session_id) {
          dispatch({ type: 'SET_SESSION_ID', payload: data.session_id });
          router.push(`/chat?session=${data.session_id}`, { scroll: false });
        }

        // Reload messages to get the complete conversation
        const sessionId = data.session_id || state.currentSessionId;
        if (sessionId) {
          await loadMessages(sessionId);
        }

        // Trigger sidebar refresh
        window.dispatchEvent(new CustomEvent('sessions-updated'));
      } catch (error: any) {
        console.error('Error sending message:', error);
        const message =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          'Failed to send message';
        toast.error(message);
        dispatch({ type: 'SET_ERROR', payload: message });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_TYPING', payload: false });
      }
    },
    [state.currentSessionId, state.messages, router, loadMessages]
  );

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
      dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  }, []);

  // Regenerate AI response
  const regenerateResponse = useCallback(
    async (messageId: string) => {
      const messageIndex = state.messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1 || messageIndex === 0) return;

      // Get the previous user message
      const userMessage = state.messages[messageIndex - 1];
      if (userMessage.role !== 'user') return;

      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_TYPING', payload: true });

        // Remove the old AI response
        dispatch({ type: 'DELETE_MESSAGE', payload: messageId });

        // Resend the user's message
        const response = await api.chat.sendMessage(
          userMessage.content,
          state.currentSessionId
        );

        // Reload messages to get the new response
        if (state.currentSessionId) {
          await loadMessages(state.currentSessionId);
        }

        toast.success('Response regenerated!');
      } catch (error: any) {
        console.error('Error regenerating:', error);
        toast.error('Failed to regenerate response');
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        dispatch({ type: 'SET_TYPING', payload: false });
      }
    },
    [state.messages, state.currentSessionId, loadMessages]
  );

  // Create new session
  // Note: Backend auto-creates sessions when user sends first message
  // This just resets the UI state for a fresh chat
  const createNewSession = useCallback(async () => {
    try {
      // Reset chat state - no session exists yet
      dispatch({ type: 'RESET_CHAT' });
      dispatch({ type: 'SET_SESSION_ID', payload: null });
      
      // Navigate to clean chat page
      router.push('/chat', { scroll: false });
      window.dispatchEvent(new CustomEvent('sessions-updated'));
      
      toast.success('New chat ready - send a message to begin');
      return null;
    } catch (error: any) {
      console.error('Error creating session:', error);
      const message = error.response?.data?.detail || 'Failed to create session';
      toast.error(message);
      dispatch({ type: 'SET_ERROR', payload: message });
      
      // Fallback: just reset local state
      dispatch({ type: 'RESET_CHAT' });
      return null;
    }
  }, [router]);

  // Delete session
  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!confirm('Are you sure you want to delete this conversation?')) {
        return;
      }

      try {
        await api.chat.deleteSession(sessionId);
        toast.success('Conversation deleted');

        if (state.currentSessionId === sessionId) {
          await createNewSession();
        }

        // Trigger sidebar refresh
        window.dispatchEvent(new CustomEvent('sessions-updated'));
      } catch (error: any) {
        console.error('Error deleting session:', error);
        const message = error.response?.data?.detail || 'Failed to delete conversation';
        toast.error(message);
      }
    },
    [state.currentSessionId, createNewSession]
  );

  return {
    messages: state.messages,
    currentSessionId: state.currentSessionId,
    loading: state.loading,
    loadingMessages: state.loadingMessages,
    error: state.error,
    sendMessage,
    loadMessages,
    deleteMessage,
    regenerateResponse,
    createNewSession,
    deleteSession,
  };
}

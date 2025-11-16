/**
 * useSessions Hook
 * Manages chat session list and operations
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ChatSession {
  id: string;
  session_id?: string;
  title: string;
  lastMessage?: string;
  created_at?: string;
  updated_at?: string;
  timestamp: string;
  messageCount?: number;
}

export function useSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all sessions
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.chat.getSessions(20);
      const sessionList = response.data.sessions || response.data || [];
      
      const formattedSessions = sessionList.map((session: any) => ({
        id: session.session_id,
        title: session.title || 'Untitled Chat',
        lastMessage: session.summary || session.last_message || '',
        timestamp: session.last_activity || session.updated_at || session.created_at || new Date().toISOString(),
        messageCount: session.message_count || 0,
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      // Don't show error toast on initial load - it's okay if backend is temporarily unavailable
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    try {
      await api.chat.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete session');
      return false;
    }
  }, []);

  // Rename session
  const renameSession = useCallback(async (sessionId: string, newTitle: string) => {
    try {
      await api.chat.updateSession(sessionId, newTitle);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, title: newTitle } : s))
      );
      toast.success('Chat renamed');
      return true;
    } catch (error) {
      console.error('Failed to rename session:', error);
      toast.error('Failed to rename chat');
      return false;
    }
  }, []);

  // Pin session (UI-only, no backend support yet)
  const pinSession = useCallback((sessionId: string) => {
    // TODO: Implement pinning when backend supports it
    console.log('Pin session:', sessionId);
    toast.info('Pin feature coming soon');
  }, []);

  // Archive session (UI-only, no backend support yet)
  const archiveSession = useCallback((sessionId: string) => {
    // TODO: Implement archiving when backend supports it
    console.log('Archive session:', sessionId);
    toast.info('Archive feature coming soon');
  }, []);

  // Add new session to list
  const addSession = useCallback((session: ChatSession) => {
    setSessions((prev) => [session, ...prev]);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    fetchSessions,
    deleteSession,
    renameSession,
    pinSession,
    archiveSession,
    addSession,
  };
}

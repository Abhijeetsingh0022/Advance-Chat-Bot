/**
 * CollapsibleSidebar Component
 * Ultra-modern black & white sidebar with advanced features
 * 
 * @version 5.0.0
 */

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  ChevronLeftIcon,
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  PencilIcon,
  StarIcon,
  ClipboardDocumentIcon,
  Bars3Icon,
  FunnelIcon,
  EllipsisVerticalIcon,
  ShareIcon,
  ArchiveBoxIcon,
  DocumentDuplicateIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  BoltIcon,
  FolderIcon,
  TagIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, CheckCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import EnhancedMemorySidebar from '@/components/memory/EnhancedMemorySidebar';
import { SettingsModal } from '@/components/settings/SettingsModal';

// ==================== API SERVICE ====================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const apiClient = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token = useAuthStore.getState().token;
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  },

  getSessions: () => apiClient.request('/chat/sessions'),
  // Note: Backend auto-creates sessions on first message via POST /chat
  // Return null to indicate session doesn't exist yet
  createSession: (title: string) => {
    return Promise.resolve(null);
  },
  updateSession: (id: string, data: any) => 
    apiClient.request(`/chat/sessions/${id}`, { 
      method: 'PUT', 
      body: JSON.stringify({ 
        title: data.title || data.name,
        is_pinned: data.is_pinned,
        status: data.status,
        description: data.description,
        category: data.category,
        tags: data.tags
      }) 
    }),
  deleteSession: (id: string) => 
    apiClient.request(`/chat/sessions/${id}`, { method: 'DELETE' }),
  
  getMemories: () => apiClient.request('/memory'),
  deleteMemory: (id: string) => 
    apiClient.request(`/memory/${id}`, { method: 'DELETE' }),
  
  getUser: () => apiClient.request('/auth/me'),
  logout: () => apiClient.request('/auth/logout', { method: 'POST' }),
};

// ==================== UTILITIES ====================

const formatRelativeTime = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return 'Unknown';
  }
};

// ==================== SESSION CARD ====================

interface SessionCardProps {
  session: any;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onPin: () => void;
  onArchive: () => void;
  onShare: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isActive,
  onSelect,
  onRename,
  onPin,
  onArchive,
  onShare,
  onDuplicate,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="group relative">
      <button
        onClick={onSelect}
        className={[
          'w-full rounded-lg p-3 text-left transition-all',
          isActive
            ? 'bg-white text-black shadow-lg dark:bg-gray-900 dark:text-white'
            : 'bg-gray-100 text-black hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700',
        ].join(' ')}
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="flex-1 truncate text-sm font-semibold">
            {session.title}
          </h3>
          <div className="flex items-center gap-1">
            {session.is_pinned && (
              <StarIconSolid className="h-3.5 w-3.5 flex-shrink-0 text-yellow-500" />
            )}
            {isActive && (
              <CheckCircleIcon className="h-3.5 w-3.5 flex-shrink-0 text-black dark:text-white" />
            )}
          </div>
        </div>

        {session.preview && (
          <p className={[
            'mb-2 line-clamp-2 text-xs',
            isActive ? 'text-gray-600 dark:text-gray-400' : 'text-gray-600 dark:text-gray-500'
          ].join(' ')}>
            {session.preview}
          </p>
        )}

        <div className={[
          'flex items-center gap-2 text-xs',
          isActive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-600 dark:text-gray-500'
        ].join(' ')}>
          <ClockIcon className="h-3 w-3" />
          <span>{formatRelativeTime(session.created_at)}</span>
          {session.message_count > 0 && (
            <>
              <span>•</span>
              <span>{session.message_count}</span>
            </>
          )}
        </div>
      </button>

      {/* Context Menu */}
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className={[
            'rounded-md p-1.5 transition-colors',
            isActive
              ? 'bg-gray-100 text-black hover:bg-gray-200 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'
              : 'bg-gray-200 text-black hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
          ].join(' ')}
        >
          <EllipsisVerticalIcon className="h-4 w-4" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-300 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <div className="p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRename();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-gray-900"
              >
                <PencilIcon className="h-4 w-4" />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPin();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-gray-900"
              >
                <StarIcon className="h-4 w-4" />
                {session.is_pinned ? 'Unpin' : 'Pin'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-gray-900"
              >
                <ArchiveBoxIcon className="h-4 w-4" />
                Archive
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-gray-900"
              >
                <ShareIcon className="h-4 w-4" />
                Share
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-white transition-colors hover:bg-gray-900"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
                Duplicate
              </button>
              <div className="my-1 border-t border-gray-800" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== MEMORY CARD ====================

interface MemoryCardProps {
  memory: any;
  onCopy: () => void;
  onDelete: () => void;
}

const MemoryCard: React.FC<MemoryCardProps> = ({ memory, onCopy, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className="group relative rounded-lg bg-gray-100 p-3 transition-all hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <SparklesIcon className="h-3.5 w-3.5 text-black dark:text-white" />
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {memory.type ? memory.type.charAt(0).toUpperCase() + memory.type.slice(1) : 'Memory'}
          </span>
        </div>
        {showActions && (
          <div className="flex items-center gap-1">
            <button
              onClick={onCopy}
              className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-300 hover:text-black dark:text-gray-400 dark:hover:bg-gray-600 dark:hover:text-white"
              title="Copy"
            >
              <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded p-1 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
              title="Delete"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <h4 className="mb-1 text-sm font-medium text-black dark:text-white">
        {memory.title || 'Untitled Memory'}
      </h4>
      <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
        {memory.content || 'No content'}
      </p>

      <div className="mt-2 text-xs text-gray-500 dark:text-gray-500">
        {memory.created_at ? formatRelativeTime(memory.created_at) : 'Unknown'}
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

interface CollapsibleSidebarProps {
  currentSessionId?: string;
  onSessionSelect: (id: string) => void;
  onNewSession: () => void;
  onDeleteSession?: () => void;
  onToggleSidebar?: (isOpen: boolean) => void;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  currentSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onToggleSidebar,
}) => {
  const router = useRouter();
  const { user, token, logout: storeLogout } = useAuthStore();

  // State
  const [isOpen, setIsOpen] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'memories'>('chats');
  const [filterBy, setFilterBy] = useState<'all' | 'pinned' | 'archived'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'alphabetical'>('recent');
  const [sessions, setSessions] = useState<any[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch data
  const fetchSessions = useCallback(async () => {
    try {
      const data = await apiClient.getSessions();
      // Backend returns { sessions: [...], total: ..., page: ..., page_size: ... }
      const sessionsData = data.sessions || data || [];
      setSessions(sessionsData);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
      // Don't show error on first load
      if (sessions.length > 0) {
        toast.error('Failed to load chats');
      }
    }
  }, [sessions.length]);

  const fetchMemories = useCallback(async () => {
    try {
      const data = await apiClient.getMemories();
      const memoriesArray = data.memories || data || [];
      const normalizedMemories = memoriesArray.map((memory: any) => ({
        ...memory,
        id: memory.id || memory._id,
      }));
      setMemories(normalizedMemories);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchSessions(), fetchMemories()]);
      setIsLoading(false);
    };

    if (token) {
      loadData();
    }
  }, [token, fetchSessions, fetchMemories]);

  // Filtered and sorted sessions
  const processedSessions = useMemo(() => {
    return sessions
      .filter((s) => {
        const matchesSearch = s.title?.toLowerCase().includes(searchQuery.toLowerCase());
        const status = s.status || 'active';
        
        if (filterBy === 'pinned') return matchesSearch && s.is_pinned;
        if (filterBy === 'archived') return matchesSearch && status === 'archived';
        return matchesSearch && status !== 'archived';
      })
      .sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        if (sortBy === 'alphabetical') {
          return a.title.localeCompare(b.title);
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [sessions, searchQuery, filterBy, sortBy]);

  // Handlers
  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    onToggleSidebar?.(!isOpen);
  }, [isOpen, onToggleSidebar]);

  const handleCreateSession = useCallback(async () => {
    try {
      // Backend creates sessions automatically when user sends first message
      // Just trigger new session in UI, no session exists yet
      onNewSession();
      toast.success('New chat ready - send a message to begin');
    } catch (error) {
      console.error('Failed to create session:', error);
      toast.error('Failed to create chat');
    }
  }, [onNewSession]);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      if (!confirm('Delete this chat?')) return;

      try {
        await apiClient.deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId && s.session_id !== sessionId));
        toast.success('Chat deleted');
        onDeleteSession?.();
      } catch (error) {
        console.error('Failed to delete session:', error);
        toast.error('Failed to delete chat');
      }
    },
    [onDeleteSession]
  );

  const handleRenameSession = useCallback(async () => {
    if (!editingTitle.trim() || !editingSessionId) return;

    try {
      await apiClient.updateSession(editingSessionId, { title: editingTitle.trim() });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSessionId || s.session_id === editingSessionId
            ? { ...s, title: editingTitle.trim() }
            : s
        )
      );
      toast.success('Chat renamed');
    } catch (error) {
      console.error('Failed to rename:', error);
      toast.error('Failed to rename chat');
    } finally {
      setEditingSessionId(null);
      setEditingTitle('');
    }
  }, [editingTitle, editingSessionId]);

  const handlePinSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId || s.session_id === sessionId);
    if (!session) return;

    const newPinState = !session.is_pinned;
    try {
      await apiClient.updateSession(sessionId, { is_pinned: newPinState });
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId || s.session_id === sessionId
            ? { ...s, is_pinned: newPinState }
            : s
        )
      );
      toast.success(newPinState ? 'Pinned' : 'Unpinned');
    } catch (error) {
      console.error('Failed to pin/unpin:', error);
      toast.error('Failed to update');
    }
  }, [sessions]);

  const handleArchiveSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId || s.session_id === sessionId);
    if (!session) return;

    const newStatus = session.status === 'archived' ? 'active' : 'archived';
    try {
      await apiClient.updateSession(sessionId, { status: newStatus });
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === sessionId || s.session_id === sessionId) {
            return { ...s, status: newStatus };
          }
          return s;
        })
      );
      toast.success(newStatus === 'archived' ? 'Archived' : 'Restored');
    } catch (error) {
      console.error('Failed to archive/restore:', error);
      toast.error('Failed to update');
    }
  }, [sessions]);

  const handleShareSession = useCallback(async (sessionId: string) => {
    const url = `${window.location.origin}/chat/${sessionId}`;
    await navigator.clipboard.writeText(url);
    toast.success('Link copied to clipboard');
  }, []);

  const handleDuplicateSession = useCallback(async (sessionId: string) => {
    // Backend doesn't support duplication yet
    toast('Duplication feature coming soon', { icon: 'ℹ️' });
  }, []);

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    try {
      await apiClient.deleteMemory(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      toast.success('Memory deleted');
    } catch (error) {
      console.error('Failed to delete memory:', error);
      toast.error('Failed to delete memory');
    }
  }, []);

  const handleMemoryCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  }, []);

  const handleExportSessions = useCallback(() => {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chats-${new Date().toISOString()}.json`;
    a.click();
    toast.success('Exported successfully');
  }, [sessions]);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient.logout();
      storeLogout();
      toast.success('Logged out');
      router.push('/login');
    } catch (error) {
      storeLogout();
      router.push('/login');
    }
  }, [storeLogout, router]);

  // Collapsed state
  if (!isOpen) {
    return (
      <>
        {/* Mobile toggle */}
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-4 top-4 z-50 rounded-lg bg-black p-2 shadow-2xl md:hidden"
        >
          <Bars3Icon className="h-6 w-6 text-white" />
        </button>

        {/* Desktop collapsed */}
        <aside className="hidden h-screen w-16 flex-col items-center gap-4 border-r border-gray-300 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 md:flex">
          <button
            onClick={handleToggle}
            className="rounded-lg bg-black p-2 text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            <Bars3Icon className="h-5 w-5" />
          </button>

          <button
            onClick={handleCreateSession}
            className="rounded-lg bg-gray-900 p-2 text-white transition-colors hover:bg-gray-800"
          >
            <PlusIcon className="h-5 w-5" />
          </button>

          {memories.length > 0 && (
            <div className="relative">
              <SparklesIcon className="h-5 w-5 text-gray-600" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                {Math.min(memories.length, 9)}
              </span>
            </div>
          )}

          <div className="flex-1" />

          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="rounded-lg bg-gray-900 p-2 text-white transition-colors hover:bg-gray-800"
          >
            <UserCircleIcon className="h-5 w-5" />
          </button>
        </aside>
      </>
    );
  }

  // Expanded state
  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-black">
      {/* Header */}
      <div className="border-b border-gray-900 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-black p-2 dark:bg-white">
              <SparklesIcon className="h-5 w-5 text-white dark:text-black" />
            </div>
            <h2 className="font-bold text-black dark:text-white">ChatBot</h2>
          </div>
          <button
            onClick={() => {
              setIsOpen(false);
              setIsMobileOpen(false);
            }}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={handleCreateSession}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          <PlusIcon className="h-5 w-5" />
          New Chat
        </button>
      </div>

      {/* Tabs & Search */}
      <div className="border-b border-gray-900 p-4">
        {/* Tabs */}
        <div className="mb-3 flex gap-2">
          <button
            onClick={() => setActiveTab('chats')}
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'chats'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-gray-600 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
            ].join(' ')}
          >
            <div className="flex items-center justify-center gap-2">
              <ClockIcon className="h-4 w-4" />
              <span>Chats</span>
              <span className={[
                'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                activeTab === 'chats'
                  ? 'bg-white text-black dark:bg-black dark:text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              ].join(' ')}>
                {sessions.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('memories')}
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === 'memories'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'text-gray-600 hover:bg-gray-200 hover:text-black dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white',
            ].join(' ')}
          >
            <div className="flex items-center justify-center gap-2">
              <SparklesIcon className="h-4 w-4" />
              <span>Memory</span>
              <span className={[
                'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                activeTab === 'memories'
                  ? 'bg-white text-black dark:bg-black dark:text-white'
                  : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              ].join(' ')}>
                {memories.length}
              </span>
            </div>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-black placeholder-gray-500 focus:border-black focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-400 dark:focus:border-white"
          />
        </div>

        {/* Filters - Only for chats */}
        {activeTab === 'chats' && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-gray-800"
            >
              <FunnelIcon className="h-3.5 w-3.5" />
              Filters
            </button>
            <button
              onClick={handleExportSessions}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-gray-800"
            >
              <ArrowDownTrayIcon className="h-3.5 w-3.5" />
              Export
            </button>
          </div>
        )}

        {/* Filter Options */}
        {showFilters && activeTab === 'chats' && (
          <div className="mt-2 space-y-2 rounded-lg bg-gray-100 p-3 dark:bg-gray-800">
            <div>
              <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">Show</label>
              <div className="flex gap-1">
                {['all', 'pinned', 'archived'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterBy(filter as any)}
                    className={[
                      'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                      filterBy === filter
                        ? 'bg-black text-white dark:bg-white dark:text-black'
                        : 'bg-white text-gray-600 hover:text-black dark:bg-gray-900 dark:text-gray-400 dark:hover:text-white',
                    ].join(' ')}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Sort by</label>
              <div className="flex gap-1">
                {['recent', 'alphabetical'].map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort as any)}
                    className={[
                      'flex-1 rounded px-2 py-1 text-xs font-medium transition-colors',
                      sortBy === sort
                        ? 'bg-white text-black'
                        : 'bg-black text-gray-500 hover:text-white',
                    ].join(' ')}
                  >
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center p-4">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'chats' ? (
          <div className="p-4 space-y-2">
            {processedSessions.length === 0 ? (
              <div className="py-12 text-center">
                <ClockIcon className="mx-auto mb-3 h-12 w-12 text-gray-400 dark:text-gray-600" />
                <p className="text-sm text-gray-600 dark:text-gray-400">No chats found</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  {filterBy !== 'all' ? 'Try changing filters' : 'Start a conversation'}
                </p>
              </div>
            ) : (
              processedSessions.map((session) => {
                const sessionId = session.session_id || session.id;
                return (
                  <SessionCard
                    key={sessionId}
                    session={session}
                    isActive={currentSessionId === sessionId}
                    onSelect={() => onSessionSelect(sessionId)}
                    onRename={() => {
                      setEditingSessionId(sessionId);
                      setEditingTitle(session.title);
                    }}
                    onPin={() => handlePinSession(sessionId)}
                    onArchive={() => handleArchiveSession(sessionId)}
                    onShare={() => handleShareSession(sessionId)}
                    onDuplicate={() => handleDuplicateSession(sessionId)}
                    onDelete={() => handleDeleteSession(sessionId)}
                  />
                );
              })
            )}
          </div>
        ) : (
          <EnhancedMemorySidebar
            memories={memories}
            onRefresh={fetchMemories}
            onDeleteMemory={handleDeleteMemory}
            onCopyMemory={handleMemoryCopy}
          />
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-300 p-4 dark:border-gray-700">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex w-full items-center gap-3 rounded-lg bg-gray-100 p-3 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <UserCircleIcon className="h-5 w-5 text-black dark:text-white" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-black dark:text-white">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{user?.email || 'No email'}</p>
            </div>
            <Cog6ToothIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-gray-300 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowSettings(true);
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-black transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                  Settings
                </button>
                <div className="my-1 border-t border-gray-300 dark:border-gray-700" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <ArrowRightOnRectangleIcon className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Rename Modal */}
      {editingSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-300 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
              Rename Chat
            </h3>
            <input
              type="text"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSession();
                if (e.key === 'Escape') setEditingSessionId(null);
              }}
              className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:focus:border-white"
              placeholder="Enter chat name..."
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setEditingSessionId(null)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSession}
                className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/80"
            onClick={() => setIsMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-80 border-r border-gray-300 dark:border-gray-700">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden h-screen w-80 border-r border-gray-300 dark:border-gray-700 md:block">
        {sidebarContent}
      </aside>

      {/* Mobile toggle when collapsed */}
      {!isOpen && (
        <button
          onClick={() => setIsMobileOpen(true)}
          className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-2xl dark:bg-black md:hidden"
        >
          <Bars3Icon className="h-6 w-6 text-white" />
        </button>
      )}
    </>
  );
};

export { CollapsibleSidebar };
export default CollapsibleSidebar;

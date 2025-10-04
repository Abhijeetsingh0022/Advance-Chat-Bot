'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore, useSettingsStore } from '@/store';
import { useState, useEffect } from 'react';
import { chatAPI } from '@/lib/api';
import type { ChatSession } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import {
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  SparklesIcon,
  ClockIcon,
  StarIcon,
  TrashIcon,
  ChartBarIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const [conversationsExpanded, setConversationsExpanded] = useState(true);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [hoveredSession, setHoveredSession] = useState<string | null>(null);

  // Load sessions when on chat page
  useEffect(() => {
    if (pathname === '/chat') {
      loadSessions();
    }
  }, [pathname]);

  // Listen for session updates from chat page
  useEffect(() => {
    const handleSessionsUpdated = () => {
      if (pathname === '/chat') {
        loadSessions();
      }
    };
    
    window.addEventListener('sessions-updated', handleSessionsUpdated);
    return () => window.removeEventListener('sessions-updated', handleSessionsUpdated);
  }, [pathname]);

  const loadSessions = async () => {
    setLoadingSessions(true);
    try {
      const { data } = await chatAPI.getSessions({ 
        limit: 50, 
        sort_by: 'last_activity', 
        sort_order: 'desc' 
      });
      setSessions(data.sessions || []);
    } catch (error: any) {
      console.warn('Unable to load sessions:', error);
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const createNewSession = () => {
    router.push('/chat');
    // Trigger a refresh event that the chat page can listen to
    window.dispatchEvent(new CustomEvent('new-chat'));
  };

  const handleSessionClick = (sessionId: string) => {
    router.push(`/chat?session=${sessionId}`);
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await chatAPI.deleteSession(sessionId);
      toast.success('Conversation deleted');
      loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleToggleFavorite = async (sessionId: string, isFavorite: boolean | undefined, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await chatAPI.updateSession(sessionId, { is_favorite: !isFavorite });
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
      loadSessions();
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast.error('Failed to update favorite');
    }
  };

  const filteredSessions = sessions.filter((session) =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoritesSessions = filteredSessions.filter(s => s.is_favorite);
  const recentSessions = filteredSessions.filter(s => !s.is_favorite).slice(0, 15);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
      logout();
      toast.success('Logged out successfully');
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      logout();
      router.push('/login');
    }
  };

  const navigation = [
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Profile', href: '/profile', icon: UserCircleIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  if (user?.is_admin) {
    navigation.push({
      name: 'Admin',
      href: '/admin',
      icon: ShieldCheckIcon,
    });
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-3 rounded-2xl backdrop-blur-xl bg-white/90 dark:bg-black/90 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl hover:scale-110 transition-transform"
      >
        {sidebarCollapsed ? (
          <Bars3Icon className="w-6 h-6 text-black dark:text-white" />
        ) : (
          <XMarkIcon className="w-6 h-6 text-black dark:text-white" />
        )}
      </button>

      {/* Overlay for mobile */}
      {!sidebarCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fade-in"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 backdrop-blur-xl bg-gradient-to-b from-white/80 via-white/70 to-gray-50/70 dark:from-black/80 dark:via-black/70 dark:to-gray-950/70 border-r border-gray-200/50 dark:border-gray-800/50 flex flex-col transition-all duration-300 shadow-2xl ${
          sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        }`}
      >
        {/* Logo/Brand with gradient */}
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-white/50 to-gray-100/50 dark:from-black/50 dark:to-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-black via-gray-800 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-6 h-6 text-white dark:text-black" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                ChatBot AI
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-500 font-medium">
                Powered by AI
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-thin">
          {/* New Chat Button - Primary CTA */}
          <button
            onClick={() => {
              createNewSession();
              if (window.innerWidth < 1024) toggleSidebar();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-black via-gray-800 to-gray-700 dark:from-white dark:via-gray-200 dark:to-gray-300 text-white dark:text-black hover:scale-105 transition-all transform shadow-xl hover:shadow-2xl font-semibold"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="text-sm">New Chat</span>
          </button>

          {/* Navigation Links */}
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-black/90 to-gray-700/90 dark:from-white/90 dark:to-gray-300/90 text-white dark:text-black shadow-lg scale-105'
                    : 'backdrop-blur-xl bg-white/40 dark:bg-black/40 border border-gray-200/30 dark:border-gray-800/30 text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-black/60 hover:border-gray-300/50 dark:hover:border-gray-700/50 hover:scale-105'
                }`}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    toggleSidebar();
                  }
                }}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? '' : 'text-gray-600 dark:text-gray-400'}`} />
                <span className="font-semibold text-sm">{item.name}</span>
              </Link>
            );
          })}

          {/* Conversations Section - Only show on chat page */}
          {pathname === '/chat' && (
            <div className="mt-6 pt-6 border-t border-gray-200/50 dark:border-gray-800/50 space-y-3">
              {/* Collapsible Conversations Header */}
              <button
                onClick={() => setConversationsExpanded(!conversationsExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/50 to-gray-100/50 dark:from-black/50 dark:to-gray-900/50 hover:from-white/70 hover:to-gray-100/70 dark:hover:from-black/70 dark:hover:to-gray-900/70 transition-all border border-gray-200/30 dark:border-gray-800/30 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  {conversationsExpanded ? (
                    <ChevronDownIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform" />
                  )}
                  <ClockIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                    Recent Chats
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-black/10 dark:bg-white/10 text-xs font-bold text-gray-700 dark:text-gray-300">
                  {sessions.length}
                </span>
              </button>

              {/* Expandable Content */}
              {conversationsExpanded && (
                <div className="space-y-2 animate-fade-in">
                  {/* Search */}
                  <div className="relative px-1">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-600 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full pl-10 pr-3 py-2.5 text-sm rounded-2xl backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/30 dark:border-gray-800/30 focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 focus:border-transparent text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all shadow-sm"
                    />
                  </div>

                  {/* Loading State */}
                  {loadingSessions && (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white"></div>
                    </div>
                  )}

                  {/* Favorites Section */}
                  {!loadingSessions && favoritesSessions.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 px-3 py-2">
                        <StarIconSolid className="w-3.5 h-3.5 text-yellow-500" />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Favorites
                        </span>
                      </div>
                      {favoritesSessions.map((session) => (
                        <div
                          key={session.session_id}
                          onMouseEnter={() => setHoveredSession(session.session_id)}
                          onMouseLeave={() => setHoveredSession(null)}
                          onClick={() => handleSessionClick(session.session_id)}
                          className="group relative px-3 py-2.5 rounded-xl backdrop-blur-xl bg-gradient-to-r from-white/40 to-gray-50/40 dark:from-black/40 dark:to-gray-950/40 hover:from-white/60 hover:to-gray-50/60 dark:hover:from-black/60 dark:hover:to-gray-950/60 border border-gray-200/30 dark:border-gray-800/30 cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
                        >
                          <div className="flex items-start gap-2">
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {session.title || 'New Conversation'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                              </p>
                            </div>
                            {hoveredSession === session.session_id && (
                              <div className="flex items-center gap-1 animate-fade-in">
                                <button
                                  onClick={(e) => handleToggleFavorite(session.session_id, session.is_favorite, e)}
                                  className="p-1 rounded-lg hover:bg-yellow-500/20 transition-colors"
                                >
                                  <StarIconSolid className="w-4 h-4 text-yellow-500" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteSession(session.session_id, e)}
                                  className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Recent Sessions */}
                  {!loadingSessions && recentSessions.length > 0 && (
                    <div className="space-y-1">
                      {favoritesSessions.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 mt-3">
                          <ClockIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-500" />
                          <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            Recent
                          </span>
                        </div>
                      )}
                      {recentSessions.map((session) => (
                        <div
                          key={session.session_id}
                          onMouseEnter={() => setHoveredSession(session.session_id)}
                          onMouseLeave={() => setHoveredSession(null)}
                          onClick={() => handleSessionClick(session.session_id)}
                          className="group relative px-3 py-2.5 rounded-xl backdrop-blur-xl bg-white/30 dark:bg-black/30 hover:bg-white/50 dark:hover:bg-black/50 border border-gray-200/20 dark:border-gray-800/20 hover:border-gray-300/40 dark:hover:border-gray-700/40 cursor-pointer transition-all hover:scale-105 hover:shadow-md"
                        >
                          <div className="flex items-start gap-2">
                            <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-500 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                                {session.title || 'New Conversation'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                <ClockIcon className="w-3 h-3" />
                                {formatDistanceToNow(new Date(session.last_activity), { addSuffix: true })}
                              </p>
                            </div>
                            {hoveredSession === session.session_id && (
                              <div className="flex items-center gap-1 animate-fade-in">
                                <button
                                  onClick={(e) => handleToggleFavorite(session.session_id, session.is_favorite, e)}
                                  className="p-1 rounded-lg hover:bg-yellow-500/20 transition-colors"
                                >
                                  <StarIcon className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteSession(session.session_id, e)}
                                  className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
                                >
                                  <TrashIcon className="w-4 h-4 text-gray-400 hover:text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty State */}
                  {!loadingSessions && filteredSessions.length === 0 && (
                    <div className="text-center py-12 px-4">
                      <ChatBubbleLeftRightIcon className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-500">
                        {searchQuery ? 'No conversations found' : 'No conversations yet'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">
                        {searchQuery ? 'Try a different search term' : 'Start a new chat to begin'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-800/50 space-y-2 bg-gradient-to-r from-white/50 to-gray-100/50 dark:from-black/50 dark:to-gray-900/50">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/30 dark:border-gray-800/30 text-gray-700 dark:text-gray-300 hover:bg-white/70 dark:hover:bg-black/70 hover:scale-105 transition-all transform shadow-sm"
          >
            {theme === 'dark' ? (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <SunIcon className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-sm">Light Mode</span>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <MoonIcon className="w-5 h-5 text-white" />
                </div>
                <span className="font-semibold text-sm">Dark Mode</span>
              </>
            )}
          </button>

          {/* User Info */}
          {user && (
            <div className="px-4 py-3 rounded-2xl backdrop-blur-xl bg-gradient-to-r from-white/40 to-gray-100/40 dark:from-black/40 dark:to-gray-900/40 border border-gray-200/30 dark:border-gray-800/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-md">
                  <UserCircleIcon className="w-5 h-5 text-white dark:text-black" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {user.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {user.is_admin ? 'Admin' : 'User'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl backdrop-blur-xl bg-red-50/50 dark:bg-red-950/30 border border-red-200/40 dark:border-red-800/40 text-red-700 dark:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/50 hover:scale-105 transition-all transform shadow-sm"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5" />
            <span className="font-semibold text-sm">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

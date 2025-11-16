/**
 * ChatHeader Component
 * Modern header with black & white theme
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  SparklesIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  ShareIcon,
  Cog6ToothIcon,
  CircleStackIcon,
} from '@heroicons/react/24/outline';
import { BranchSelector } from '@/components/BranchControls';
import { useAuthStore } from '@/store';
import { Message } from '@/types/chat';
import toast from 'react-hot-toast';

interface ChatHeaderProps {
  isTyping: boolean;
  messages: Message[];
  currentSessionId: string | null;
  onCopyConversation: () => void;
  onExportMarkdown: () => void;
  onExportText: () => void;
  onShareConversation: () => void;
  onDeleteSession: () => void;
  onToggleThemeCustomizer: () => void;
  onToggleMemoryDashboard?: () => void;
  onThemeToggle?: () => void;
  onBranchChange: () => void;
  onLogout?: () => void;
}

export function ChatHeader({
  isTyping,
  messages,
  currentSessionId,
  onCopyConversation,
  onExportMarkdown,
  onExportText,
  onShareConversation,
  onDeleteSession,
  onToggleThemeCustomizer,
  onToggleMemoryDashboard,
  onBranchChange,
  onLogout,
}: ChatHeaderProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const handleLogout = useCallback(() => {
    logout();
    setShowUserMenu(false);
    toast.success('Logged out successfully');
    if (onLogout) onLogout();
    router.push('/login');
  }, [logout, onLogout, router]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasMessages = messages.length > 0;

  return (
    <header className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-900 dark:bg-black">
      <div className="flex items-center justify-between gap-4">
        {/* Left: AI Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-black shadow-lg dark:bg-white">
              <SparklesIcon className="h-7 w-7 text-white dark:text-black" />
            </div>
            {!isTyping && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500 dark:border-black"></div>
            )}
          </div>
          
          <div>
            <h2 className="text-base font-bold text-black dark:text-white">
              AI Assistant
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isTyping ? (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-black dark:bg-white"></span>
                  <span
                    className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-black dark:bg-white"
                    style={{ animationDelay: '150ms' }}
                  ></span>
                  <span
                    className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-black dark:bg-white"
                    style={{ animationDelay: '300ms' }}
                  ></span>
                  <span className="ml-1">Typing...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Online
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Branch Selector */}
          {currentSessionId && hasMessages && (
            <BranchSelector
              sessionId={currentSessionId}
              currentBranchId={messages[0]?.branch_id}
              onBranchChange={onBranchChange}
            />
          )}

          {/* Quick Actions */}
          {hasMessages && (
            <>
              {/* Copy */}
              <button
                onClick={onCopyConversation}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black shadow-sm transition-all hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800"
                title="Copy conversation"
                aria-label="Copy conversation"
              >
                <ClipboardDocumentIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Copy</span>
              </button>

              {/* Export Menu */}
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black shadow-sm transition-all hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800"
                  title="Export options"
                  aria-label="Export options"
                  aria-expanded={showExportMenu}
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-black">
                    <button
                      onClick={() => {
                        onExportMarkdown();
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-black transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-900"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Markdown
                    </button>
                    <button
                      onClick={() => {
                        onExportText();
                        setShowExportMenu(false);
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-black transition-colors hover:bg-gray-100 dark:text-white dark:hover:bg-gray-900"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      Text File
                    </button>
                  </div>
                )}
              </div>

              {/* Share */}
              {currentSessionId && (
                <button
                  onClick={onShareConversation}
                  className="hidden items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-black shadow-sm transition-all hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800 md:flex"
                  title="Share conversation"
                  aria-label="Share conversation"
                >
                  <ShareIcon className="h-5 w-5" />
                  <span>Share</span>
                </button>
              )}
            </>
          )}

          {/* Delete Session */}
          {currentSessionId && (
            <button
              onClick={onDeleteSession}
              className="flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 transition-all hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
              title="Delete conversation"
              aria-label="Delete conversation"
            >
              <TrashIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}

          {/* Memory Dashboard */}
          {onToggleMemoryDashboard && (
            <button
              onClick={onToggleMemoryDashboard}
              className="flex items-center gap-2 rounded-lg bg-purple-100 px-3 py-2 text-sm font-medium text-purple-700 transition-all hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50"
              title="Memory Dashboard"
              aria-label="Memory Dashboard"
            >
              <CircleStackIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Memories</span>
            </button>
          )}

          {/* Settings */}
          <button
            onClick={onToggleThemeCustomizer}
            className="rounded-lg bg-white p-2.5 text-black shadow-sm transition-all hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800"
            title="Settings"
            aria-label="Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="rounded-lg bg-white p-2.5 text-black shadow-sm transition-all hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800"
              title="User menu"
              aria-label="User menu"
              aria-expanded={showUserMenu}
            >
              <UserCircleIcon className="h-5 w-5" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-black">
                <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
                  <p className="truncate text-sm font-semibold text-black dark:text-white">
                    {user?.name || user?.email || 'User'}
                  </p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
  
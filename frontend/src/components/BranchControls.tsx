/**
 * BranchControls Component
 * Manages conversation branches/threads
 */

'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Branch {
  id: string;
  name: string;
  created_at: string;
  message_count: number;
}

interface BranchSelectorProps {
  sessionId: string;
  currentBranchId?: string;
  onBranchChange?: () => void;
  messageId?: string;
  messageContent?: string;
  onBranchCreated?: () => void;
}

export function BranchSelector({
  sessionId,
  currentBranchId,
  onBranchChange,
  messageId,
  messageContent,
  onBranchCreated,
}: BranchSelectorProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const response = await api.chat.getBranches(sessionId);
      setBranches(response.data.branches || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
      setBranches([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && isOpen) {
      loadBranches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isOpen]);

  const handleBranchSelect = async (branchId: string) => {
    try {
      await api.chat.activateBranch(sessionId, branchId);
      setIsOpen(false);
      onBranchChange?.();
    } catch (error) {
      console.error('Failed to switch branch:', error);
    }
  };

  const handleCreateBranch = async () => {
    try {
      const branchName = prompt('Enter branch name:');
      if (!branchName) return;

      await api.chat.createBranch(messageId || '', branchName, messageContent);
      await loadBranches();
      onBranchCreated?.();
    } catch (error) {
      console.error('Failed to create branch:', error);
    }
  };

  if (!sessionId) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 text-sm text-black dark:text-white bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium border border-gray-200/50 dark:border-gray-800/50 flex items-center gap-2"
        title="Manage branches"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01"
          />
        </svg>
        Branches
        {branches.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-black/20 dark:bg-white/20 rounded-full">
            {branches.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden z-50 backdrop-blur-xl">
          <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black dark:text-white">
              Conversation Branches
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-black dark:hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                Loading branches...
              </div>
            ) : branches.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                No branches yet
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {branches.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => handleBranchSelect(branch.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
                      currentBranchId === branch.id
                        ? 'bg-blue-50 dark:bg-blue-900/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-black dark:text-white">
                          {branch.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {branch.message_count} messages
                        </div>
                      </div>
                      {currentBranchId === branch.id && (
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={handleCreateBranch}
              className="w-full px-3 py-2 text-sm text-white dark:text-black bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              <svg
                className="w-4 h-4 inline mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create New Branch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Export as BranchControls for compatibility
export const BranchControls = BranchSelector;

'use client';

import { useState, useEffect } from 'react';
import { CodeBracketSquareIcon, PencilIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { ConversationBranch } from '@/types';
import { chatAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface BranchControlsProps {
  sessionId: string;
  messageId: string;
  messageContent: string;
  onBranchCreated?: (branchId: string) => void;
}

export function BranchControls({ sessionId, messageId, messageContent, onBranchCreated }: BranchControlsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editedContent, setEditedContent] = useState(messageContent);
  const [branchName, setBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateBranch = async () => {
    if (!editedContent.trim()) {
      toast.error('Message content cannot be empty');
      return;
    }

    setIsCreating(true);
    try {
      const { data } = await chatAPI.createBranch(messageId, editedContent, branchName || undefined);
      toast.success(`Branch "${data.branch_name}" created`);
      setShowEditDialog(false);
      if (onBranchCreated) onBranchCreated(data.branch_id);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowEditDialog(true)}
        className="p-1.5 rounded-lg backdrop-blur-xl bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all hover:scale-110"
        title="Edit and create branch"
      >
        <PencilIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-white/50 to-gray-100/50 dark:from-black/50 dark:to-gray-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <CodeBracketSquareIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Create Conversation Branch
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Edit the message to create an alternate conversation path
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Branch Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Branch Name (Optional)
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g., Alternative Approach"
                  className="w-full px-4 py-2 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Edited Message
                </label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-3 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none font-mono text-sm"
                  placeholder="Edit your message here..."
                />
              </div>

              {/* Info */}
              <div className="flex items-start gap-2 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/50">
                <CodeBracketSquareIcon className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-purple-800 dark:text-purple-300">
                  A new branch will be created starting from this point in the conversation. You can switch between branches later.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-white/50 to-gray-100/50 dark:from-black/50 dark:to-gray-900/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditDialog(false)}
                disabled={isCreating}
                className="px-4 py-2 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all font-semibold text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                disabled={isCreating || !editedContent.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
              >
                {isCreating ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface BranchSelectorProps {
  sessionId: string;
  currentBranchId?: string;
  onBranchChange?: () => void;
}

export function BranchSelector({ sessionId, currentBranchId, onBranchChange }: BranchSelectorProps) {
  const [branches, setBranches] = useState<ConversationBranch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBranches, setShowBranches] = useState(false);

  useEffect(() => {
    loadBranches();
  }, [sessionId]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const { data } = await chatAPI.getBranches(sessionId);
      setBranches(data.branches || []);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateBranch = async (branchId: string) => {
    try {
      await chatAPI.activateBranch(sessionId, branchId);
      toast.success('Branch activated');
      setShowBranches(false);
      if (onBranchChange) onBranchChange();
    } catch (error) {
      toast.error('Failed to activate branch');
    }
  };

  if (branches.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowBranches(!showBranches)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-xl bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all border border-gray-200/50 dark:border-gray-800/50"
      >
        <CodeBracketSquareIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          {branches.length} {branches.length === 1 ? 'Branch' : 'Branches'}
        </span>
      </button>

      {showBranches && (
        <div className="absolute top-full right-0 mt-2 w-80 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-black/90 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl animate-fade-in z-10 overflow-hidden">
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-800/50 bg-gradient-to-r from-white/50 to-gray-100/50 dark:from-black/50 dark:to-gray-900/50">
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              Conversation Branches
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Switch between different conversation paths
            </p>
          </div>

          <div className="max-h-96 overflow-y-auto p-2">
            {branches.map((branch) => (
              <button
                key={branch.branch_id}
                onClick={() => handleActivateBranch(branch.branch_id)}
                className={`w-full text-left p-3 rounded-xl transition-all mb-2 ${
                  branch.is_active
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-2 border-purple-500/50'
                    : 'bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 border border-gray-200/30 dark:border-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {branch.is_active && (
                        <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                      )}
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {branch.branch_name || `Branch ${branch.branch_id.slice(0, 8)}`}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {branch.message_count} messages • Created {new Date(branch.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {branch.is_active && (
                    <div className="px-2 py-1 rounded-lg bg-purple-500 text-white text-xs font-semibold">
                      Active
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

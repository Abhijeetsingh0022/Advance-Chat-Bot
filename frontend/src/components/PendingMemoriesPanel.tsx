/**
 * PendingMemoriesPanel Component
 * Display and manage pending memory verifications
 */

'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import MemoryVerificationCard from './MemoryVerificationCard';
import { 
  BellAlertIcon, 
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface PendingMemory {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  category?: string;
  importance_score: number;
  confidence_score: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'corrected';
  verified_at?: string;
  created_at: string;
}

interface PendingMemoriesPanelProps {
  compact?: boolean;
  maxDisplay?: number;
  onVerificationComplete?: () => void;
}

const PendingMemoriesPanel: React.FC<PendingMemoriesPanelProps> = ({
  compact = false,
  maxDisplay = 10,
  onVerificationComplete,
}) => {
  const [pendingMemories, setPendingMemories] = useState<PendingMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPendingMemories = async () => {
    try {
      setRefreshing(true);
      const response = await api.memory.getPendingMemories(maxDisplay);
      setPendingMemories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch pending memories:', error);
      toast.error('Failed to load pending memories');
      setPendingMemories([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPendingMemories();
  }, [maxDisplay]);

  const handleVerify = async (
    memoryId: string,
    action: 'confirm' | 'reject' | 'correct',
    correctedContent?: string,
    feedback?: string
  ) => {
    try {
      const requestData: any = {
        action, // Send action directly (confirm/reject/correct)
      };

      if (correctedContent) {
        requestData.corrected_content = correctedContent;
      }
      if (feedback) {
        requestData.feedback = feedback;
      }

      await api.memory.verifyMemory(memoryId, requestData);

      // Remove from pending list
      setPendingMemories((prev) => prev.filter((m) => m.id !== memoryId));

      // Show success message
      const actionText = action === 'confirm' ? 'confirmed' : action === 'reject' ? 'rejected' : 'corrected';
      toast.success(`Memory ${actionText} successfully`);

      // Notify parent component
      onVerificationComplete?.();
    } catch (error: any) {
      console.error('Failed to verify memory:', error);
      toast.error(error.response?.data?.detail || 'Failed to verify memory');
      throw error;
    }
  };

  const handleBulkConfirmAll = async () => {
    if (!confirm(`Are you sure you want to confirm all ${pendingMemories.length} pending memories?`)) {
      return;
    }

    const promises = pendingMemories.map((memory) =>
      handleVerify(memory.id, 'confirm').catch(() => null)
    );

    await Promise.all(promises);
    toast.success('All pending memories confirmed');
  };

  const handleBulkRejectAll = async () => {
    if (!confirm(`Are you sure you want to reject all ${pendingMemories.length} pending memories?`)) {
      return;
    }

    const promises = pendingMemories.map((memory) =>
      handleVerify(memory.id, 'reject').catch(() => null)
    );

    await Promise.all(promises);
    toast.success('All pending memories rejected');
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center justify-center py-8">
          <ArrowPathIcon className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
            Loading pending memories...
          </span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BellAlertIcon className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900 dark:text-white">
              Pending Verifications
            </span>
            {pendingMemories.length > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-yellow-500 text-white rounded-full animate-pulse">
                {pendingMemories.length}
              </span>
            )}
          </div>
          <ArrowPathIcon
            className={`w-5 h-5 transition-transform ${refreshing ? 'animate-spin' : ''} ${
              isExpanded ? 'rotate-180' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              fetchPendingMemories();
            }}
          />
        </button>

        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 space-y-2 max-h-[500px] overflow-y-auto">
            {pendingMemories.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <CheckCircleIcon className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No pending memories to verify</p>
              </div>
            ) : (
              <>
                {pendingMemories.map((memory) => (
                  <MemoryVerificationCard
                    key={memory.id}
                    id={memory.id}
                    content={memory.content}
                    memoryType={memory.memory_type}
                    category={memory.category}
                    confidenceScore={memory.confidence_score}
                    createdAt={memory.created_at}
                    status={memory.status}
                    verifiedAt={memory.verified_at}
                    onVerify={handleVerify}
                    compact
                  />
                ))}
                {pendingMemories.length > 1 && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleBulkConfirmAll}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Confirm All
                    </button>
                    <button
                      onClick={handleBulkRejectAll}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      Reject All
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <BellAlertIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Pending Verifications
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Review and verify extracted memories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {pendingMemories.length > 0 && (
            <span className="px-3 py-1 text-sm font-bold bg-yellow-500 text-white rounded-full">
              {pendingMemories.length}
            </span>
          )}
          <button
            onClick={fetchPendingMemories}
            disabled={refreshing}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {pendingMemories.length > 1 && (
        <div className="flex gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={handleBulkConfirmAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
          >
            <CheckCircleIcon className="w-5 h-5" />
            Confirm All ({pendingMemories.length})
          </button>
          <button
            onClick={handleBulkRejectAll}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
            Reject All
          </button>
        </div>
      )}

      {/* Memory List */}
      {pendingMemories.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <CheckCircleIcon className="w-16 h-16 mx-auto mb-3 text-green-500" />
          <p className="text-base font-medium mb-1">All caught up!</p>
          <p className="text-sm">No pending memories to verify</p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {pendingMemories.map((memory, index) => (
            <MemoryVerificationCard
              key={memory.id || `pending-${index}`}
              id={memory.id}
              content={memory.content}
              memoryType={memory.memory_type}
              category={memory.category}
              confidenceScore={memory.confidence_score}
              createdAt={memory.created_at}
              status={memory.status}
              verifiedAt={memory.verified_at}
              onVerify={handleVerify}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingMemoriesPanel;

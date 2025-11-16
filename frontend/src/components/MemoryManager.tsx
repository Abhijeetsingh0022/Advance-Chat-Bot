/**
 * MemoryManager Component
 * Modern memory management with black & white theme
 */

'use client';

import React, { useState } from 'react';
import MemoryCard from './MemoryCard';
import PendingMemoriesPanel from './PendingMemoriesPanel';
import { ChevronDownIcon, ShieldCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Memory {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: 'memory' | 'context' | 'summary';
  status?: 'pending' | 'confirmed' | 'rejected';
  confidence_score?: number;
}

interface MemoryManagerProps {
  memories: Memory[];
  onRemoveMemory?: (id: string) => void;
  onClearAll?: () => void;
  compact?: boolean;
  showVerification?: boolean;
}

const MemoryManager: React.FC<MemoryManagerProps> = ({
  memories = [],
  onRemoveMemory,
  onClearAll,
  compact = false,
  showVerification = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [filter, setFilter] = useState<'all' | 'memory' | 'context' | 'summary'>('all');
  const [showPending, setShowPending] = useState(false);

  const filteredMemories = memories.filter(
    (m) => filter === 'all' || m.type === filter
  );

  if (compact) {
    return (
      <div className="overflow-hidden rounded-xl border-2 border-gray-200 bg-white dark:border-gray-800 dark:bg-black">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          <span className="font-semibold text-black dark:text-white">
            Memory ({memories.length})
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isExpanded && (
          <div className="max-h-[400px] space-y-2 overflow-y-auto border-t-2 border-gray-200 p-3 dark:border-gray-800">
            {filteredMemories.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No memories yet
              </p>
            ) : (
              filteredMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  {...memory}
                  compact
                  onRemove={() => onRemoveMemory?.(memory.id)}
                />
              ))
            )}
            {memories.length > 0 && (
              <button
                onClick={onClearAll}
                className="mt-2 w-full rounded-lg px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                Clear All
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  const pendingCount = memories.filter((m) => m.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Pending Verifications Panel */}
      {showVerification && !compact && (
        <PendingMemoriesPanel
          compact
          maxDisplay={5}
          onVerificationComplete={() => {
            window.location.reload();
          }}
        />
      )}

      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-black p-2 dark:bg-white">
              <SparklesIcon className="h-5 w-5 text-white dark:text-black" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-black dark:text-white">
                Conversation Memory
              </h3>
              {pendingCount > 0 && (
                <span className="animate-pulse rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>
          <span className="rounded-full border-2 border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-black dark:border-gray-800 dark:bg-gray-900 dark:text-white">
            {memories.length}
          </span>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(['all', 'memory', 'context', 'summary'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                filter === f
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'border-2 border-gray-200 bg-white text-black hover:border-black dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Memory List */}
        {filteredMemories.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <SparklesIcon className="mx-auto mb-3 h-12 w-12 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium">
              No {filter === 'all' ? 'memories' : filter}s yet
            </p>
            <p className="mt-1 text-xs">
              Memories will appear here as you chat
            </p>
          </div>
        ) : (
          <div className="max-h-[500px] space-y-3 overflow-y-auto">
            {filteredMemories.map((memory) => (
              <MemoryCard
                key={memory.id}
                {...memory}
                onRemove={() => onRemoveMemory?.(memory.id)}
              />
            ))}
          </div>
        )}

        {/* Clear All Button */}
        {memories.length > 0 && (
          <button
            onClick={onClearAll}
            className="mt-6 w-full rounded-xl border-2 border-red-500 bg-white px-4 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/20"
          >
            Clear All Memory
          </button>
        )}
      </div>
    </div>
  );
};

export default MemoryManager;

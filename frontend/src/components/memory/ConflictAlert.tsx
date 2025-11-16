/**
 * ConflictAlert Component
 * Modern conflict alert with black & white theme
 */

'use client';

import React, { useState } from 'react';
import {
  ExclamationTriangleIcon,
  XMarkIcon,
  CheckCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface ConflictMemory {
  id: string;
  content: string;
  similarity_score: number;
  conflict_type: string;
  memory_type?: string;
  created_at: string;
}

interface Conflict {
  memory_id: string;
  conflicting_memories: ConflictMemory[];
  conflict_count: number;
}

interface ConflictAlertProps {
  conflicts: Conflict[];
  onResolve: (memoryIds: string[]) => Promise<boolean>;
  onDismiss: () => void;
}

const ConflictAlert: React.FC<ConflictAlertProps> = ({
  conflicts,
  onResolve,
  onDismiss,
}) => {
  const [expandedConflictIndex, setExpandedConflictIndex] = useState<number | null>(null);
  const [resolving, setResolving] = useState(false);

  if (conflicts.length === 0) return null;

  const handleConsolidate = async (conflict: Conflict) => {
    setResolving(true);
    try {
      const memoryIds = [conflict.memory_id, ...conflict.conflicting_memories.map((m) => m.id)];
      const success = await onResolve(memoryIds);
      if (success && expandedConflictIndex !== null) {
        setExpandedConflictIndex(null);
      }
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="fixed right-4 top-20 z-50 w-96 max-w-[calc(100vw-2rem)] animate-slide-in-right">
      <div className="rounded-xl border-2 border-red-500 bg-white shadow-2xl dark:bg-black">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-red-500 bg-red-500 p-4 text-white">
          <div className="flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 animate-pulse" />
            <h3 className="font-semibold">
              Memory Conflicts ({conflicts.length})
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1 transition-colors hover:bg-white/20"
            title="Dismiss"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Conflict List */}
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {conflicts.map((conflict, index) => (
            <div
              key={conflict.memory_id}
              className="rounded-lg border-2 border-red-500 bg-red-50 p-4 dark:bg-red-950/20"
            >
              {/* Summary */}
              <button
                onClick={() =>
                  setExpandedConflictIndex(expandedConflictIndex === index ? null : index)
                }
                className="w-full text-left"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-black dark:text-white">
                      {conflict.conflict_count} conflicting{' '}
                      {conflict.conflict_count === 1 ? 'memory' : 'memories'}
                    </p>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Click to view details
                    </p>
                  </div>
                  <ChevronDownIcon
                    className={`h-4 w-4 text-gray-600 transition-transform dark:text-gray-400 ${
                      expandedConflictIndex === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {/* Expanded Details */}
              {expandedConflictIndex === index && (
                <div className="mt-4 space-y-2">
                  {conflict.conflicting_memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="rounded-lg border-2 border-red-300 bg-white p-3 dark:border-red-700 dark:bg-black"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium uppercase text-gray-600 dark:text-gray-400">
                          {memory.conflict_type}
                        </span>
                        <span className="text-xs font-bold text-red-600 dark:text-red-400">
                          {Math.round(memory.similarity_score * 100)}% similar
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 dark:text-gray-200">
                        {memory.content}
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        {new Date(memory.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}

                  {/* Consolidate Button */}
                  <button
                    onClick={() => handleConsolidate(conflict)}
                    disabled={resolving}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    {resolving ? 'Consolidating...' : 'Consolidate Memories'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* View All */}
        <div className="border-t-2 border-gray-200 p-4 dark:border-gray-800">
          <a
            href="/memory?tab=conflicts"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-red-600 px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            View All Conflicts
          </a>
        </div>
      </div>
    </div>
  );
};

export default ConflictAlert;

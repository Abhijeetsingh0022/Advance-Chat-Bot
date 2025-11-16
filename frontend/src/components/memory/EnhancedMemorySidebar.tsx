/**
 * EnhancedMemorySidebar Component
 * Displays memories in the sidebar with filtering and actions
 * Enhanced with black & white theme
 */

'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  ShareIcon,
  ShieldCheckIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  TrashIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface MemoryBadgeEnhancedProps {
  memory: {
    id: string;
    content: string;
    memory_type?: string;
    importance_score?: number;
    confidence_score?: number;
    relevance_score?: number;
    status?: 'pending' | 'confirmed' | 'rejected' | 'corrected';
    contexts?: string[];
    verified_at?: string;
  };
  showStatus?: boolean;
  showConfidence?: boolean;
  showContexts?: boolean;
  onVerify?: (action: 'confirm' | 'reject') => void;
  onViewRelated?: () => void;
  onClick?: () => void;
  compact?: boolean;
}

const MemoryBadgeEnhanced: React.FC<MemoryBadgeEnhancedProps> = ({
  memory,
  showStatus = true,
  showConfidence = true,
  showContexts = false,
  onVerify,
  onViewRelated,
  onClick,
  compact = false,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Early return if memory is null/undefined
  if (!memory) {
    return null;
  }

  const getStatusIcon = () => {
    switch (memory.status) {
      case 'confirmed':
        return <CheckCircleSolidIcon className="h-3 w-3 text-black dark:text-white" />;
      case 'rejected':
        return <XCircleIcon className="h-3 w-3 text-red-500" />;
      case 'corrected':
        return <PencilSquareIcon className="h-3 w-3 text-gray-600 dark:text-gray-400" />;
      case 'pending':
      default:
        return <ClockIcon className="h-3 w-3 animate-pulse text-yellow-500" />;
    }
  };

  const formatScore = (score?: number) => {
    return score ? Math.round(score * 100) : 0;
  };

  if (compact) {
    return (
      <div
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-gray-200 bg-white px-2.5 py-1 text-xs font-medium transition-all hover:border-black hover:shadow-md dark:border-gray-800 dark:bg-black dark:hover:border-white"
        onClick={onClick}
        title={memory.content}
      >
        {showStatus && getStatusIcon()}
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        <span className="capitalize text-black dark:text-white">{memory.memory_type || 'memory'}</span>
        {showConfidence && memory.confidence_score && (
          <span className="ml-1 font-bold text-black dark:text-white">
            {formatScore(memory.confidence_score)}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm transition-all hover:border-black hover:shadow-lg dark:border-gray-800 dark:bg-black dark:hover:border-white"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Status Icon */}
        {showStatus && <div className="flex-shrink-0">{getStatusIcon()}</div>}

        {/* Memory Type */}
        <span className="font-semibold capitalize text-black dark:text-white">
          {memory.memory_type || 'memory'}
        </span>

        {/* Confidence Score */}
        {showConfidence && memory.confidence_score !== undefined && (
          <div className="flex items-center gap-1">
            <ShieldCheckIcon className="h-3.5 w-3.5 text-gray-400" />
            <span className="font-bold text-black dark:text-white">
              {formatScore(memory.confidence_score)}%
            </span>
          </div>
        )}

        {/* Relevance Score */}
        {memory.relevance_score !== undefined && (
          <div className="flex items-center gap-1 opacity-75">
            <SparklesIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {formatScore(memory.relevance_score)}%
            </span>
          </div>
        )}

        {/* Contexts */}
        {showContexts && memory.contexts && memory.contexts.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs capitalize text-gray-600 dark:text-gray-400">
              {memory.contexts[0]}
            </span>
            {memory.contexts.length > 1 && (
              <span className="text-xs text-gray-400">+{memory.contexts.length - 1}</span>
            )}
          </div>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border-2 border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-800 dark:bg-black">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  {getStatusIcon()}
                  <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                    {memory.memory_type || 'memory'}
                  </span>
                </div>
                <p className="text-sm font-medium text-black dark:text-white">
                  {memory.content.length > 100
                    ? `${memory.content.substring(0, 100)}...`
                    : memory.content}
                </p>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-2">
              {memory.confidence_score !== undefined && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
                  <span className="ml-1 font-bold text-black dark:text-white">
                    {formatScore(memory.confidence_score)}%
                  </span>
                </div>
              )}
              {memory.importance_score !== undefined && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Importance:</span>
                  <span className="ml-1 font-bold text-black dark:text-white">
                    {formatScore(memory.importance_score)}%
                  </span>
                </div>
              )}
              {memory.relevance_score !== undefined && (
                <div className="text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Relevance:</span>
                  <span className="ml-1 font-bold text-black dark:text-white">
                    {formatScore(memory.relevance_score)}%
                  </span>
                </div>
              )}
            </div>

            {/* Contexts */}
            {memory.contexts && memory.contexts.length > 0 && (
              <div>
                <span className="mb-1 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Contexts:
                </span>
                <div className="flex flex-wrap gap-1">
                  {memory.contexts.map((context, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
                    >
                      {context}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            {memory.status === 'pending' && onVerify && (
              <div className="flex gap-2 border-t-2 border-gray-200 pt-2 dark:border-gray-800">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify('confirm');
                    setIsExpanded(false);
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-black transition-all hover:border-black dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  Confirm
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify('reject');
                    setIsExpanded(false);
                  }}
                  className="flex flex-1 items-center justify-center gap-1 rounded border-2 border-red-500 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-all hover:bg-red-50 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/20"
                >
                  <XCircleIcon className="h-3.5 w-3.5" />
                  Reject
                </button>
              </div>
            )}

            {/* View Related */}
            {onViewRelated && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewRelated();
                }}
                className="flex w-full items-center justify-center gap-1 rounded border-2 border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-black transition-all hover:border-black dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white"
              >
                <ShareIcon className="h-3.5 w-3.5" />
                View Related Memories
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions on Hover */}
      {showActions && !isExpanded && memory.status === 'pending' && onVerify && (
        <div className="absolute left-full top-0 z-50 ml-2 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerify('confirm');
            }}
            className="rounded-full bg-black p-1.5 text-white shadow-lg transition-all hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            title="Confirm memory"
          >
            <CheckCircleIcon className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onVerify('reject');
            }}
            className="rounded-full bg-red-500 p-1.5 text-white shadow-lg transition-all hover:bg-red-600"
            title="Reject memory"
          >
            <XCircleIcon className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

// ==================== ENHANCED MEMORY SIDEBAR ====================

interface EnhancedMemorySidebarProps {
  memories: any[];
  onRefresh: () => void;
  onDeleteMemory: (memoryId: string) => void;
  onCopyMemory: (memoryId: string) => void;
}

const EnhancedMemorySidebar: React.FC<EnhancedMemorySidebarProps> = ({
  memories,
  onRefresh,
  onDeleteMemory,
  onCopyMemory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredMemories = memories.filter((memory) => {
    if (!memory) return false;

    const matchesSearch = memory.content?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || memory.memory_type === filterType;
    const matchesStatus = filterStatus === 'all' || memory.status === filterStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const memoryTypes = ['all', ...new Set(memories.map((m) => m?.memory_type).filter(Boolean))];

  return (
    <div className="flex h-full flex-col bg-white p-4 dark:bg-black">
      {/* Header with Refresh */}
      <div className="mb-4 flex items-center justify-between border-b-2 border-gray-200 pb-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-black p-1.5 dark:bg-white">
            <SparklesIcon className="h-4 w-4 text-white dark:text-black" />
          </div>
          <h3 className="text-base font-bold text-black dark:text-white">
            Memories
          </h3>
          <span className="rounded-full bg-black px-2 py-0.5 text-xs font-semibold text-white dark:bg-white dark:text-black">
            {filteredMemories.length}
          </span>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-lg border-2 border-gray-200 bg-white p-2 text-gray-600 transition-all hover:border-black dark:border-gray-800 dark:bg-black dark:text-gray-400 dark:hover:border-white"
          title="Refresh memories"
        >
          <ArrowPathIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search memories..."
          className="w-full rounded-lg border-2 border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none dark:border-gray-800 dark:bg-black dark:text-white dark:focus:border-white"
        />
      </div>

      {/* Status Filter */}
      <div className="mb-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Status
        </p>
        <div className="flex flex-wrap gap-2">
          {['all', 'confirmed', 'pending', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filterStatus === status
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-black dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white'
              }`}
            >
              {status === 'pending' && (
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-500" />
              )}
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
          Type
        </p>
        <div className="flex flex-wrap gap-2">
          {memoryTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                filterType === type
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'border-2 border-gray-200 bg-white text-gray-700 hover:border-black dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Memories List */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {filteredMemories.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <SparklesIcon className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-700" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No memories found' : 'No memories yet'}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
              {searchQuery ? 'Try a different search' : 'Memories will appear here as you chat'}
            </p>
          </div>
        ) : (
          filteredMemories.map((memory) => (
            <div
              key={memory.id}
              className="group relative rounded-lg border-2 border-gray-200 bg-white p-4 transition-all hover:border-black hover:shadow-md dark:border-gray-800 dark:bg-black dark:hover:border-white"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex-1">
                  <MemoryBadgeEnhanced
                    memory={memory}
                    compact={true}
                    showStatus={true}
                    showConfidence={true}
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => onCopyMemory(memory.id)}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-300"
                    title="Copy memory"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteMemory(memory.id)}
                    className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400"
                    title="Delete memory"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="mb-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                {memory.content}
              </p>

              {/* Scores */}
              {(memory.importance_score !== undefined || memory.confidence_score !== undefined) && (
                <div className="mt-2 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                  {memory.importance_score !== undefined && (
                    <span>
                      Importance: <strong className="text-black dark:text-white">{Math.round(memory.importance_score * 100)}%</strong>
                    </span>
                  )}
                  {memory.confidence_score !== undefined && (
                    <span>
                      Confidence: <strong className="text-black dark:text-white">{Math.round(memory.confidence_score * 100)}%</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default EnhancedMemorySidebar;

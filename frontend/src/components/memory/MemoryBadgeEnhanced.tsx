/**
 * MemoryBadgeEnhanced Component
 * Modern memory badge with black & white theme
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
        <span className="capitalize text-black dark:text-white">
          {memory.memory_type || 'memory'}
        </span>
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

export default MemoryBadgeEnhanced;

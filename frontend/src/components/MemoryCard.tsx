/**
 * MemoryCard Component
 * Modern memory card with black & white theme
 */

'use client';

import React from 'react';
import { XMarkIcon, SparklesIcon, DocumentTextIcon, ClockIcon } from '@heroicons/react/24/outline';

interface MemoryCardProps {
  title: string;
  content: string;
  timestamp?: string;
  type?: 'memory' | 'context' | 'summary';
  onRemove?: () => void;
  compact?: boolean;
}

const MemoryCard: React.FC<MemoryCardProps> = ({
  title,
  content,
  timestamp,
  type = 'memory',
  onRemove,
  compact = false,
}) => {
  const getTypeIcon = () => {
    switch (type) {
      case 'context':
        return DocumentTextIcon;
      case 'summary':
        return ClockIcon;
      case 'memory':
      default:
        return SparklesIcon;
    }
  };

  const getTypeLabel = () => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const Icon = getTypeIcon();

  if (compact) {
    return (
      <div className="group cursor-pointer rounded-lg border-2 border-gray-200 bg-white p-3 transition-all hover:border-black hover:shadow-md dark:border-gray-800 dark:bg-black dark:hover:border-white">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <Icon className="h-3 w-3 flex-shrink-0 text-gray-500 dark:text-gray-400" />
              <p className="text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                {getTypeLabel()}
              </p>
            </div>
            <p className="truncate text-sm font-medium text-black dark:text-white">
              {title}
            </p>
            {timestamp && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {new Date(timestamp).toLocaleString()}
              </p>
            )}
          </div>
          {onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="flex-shrink-0 rounded p-1 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/20 dark:hover:text-red-400"
              aria-label="Remove memory"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="group rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-black hover:shadow-lg dark:border-gray-800 dark:bg-black dark:hover:border-white">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 dark:border-gray-800 dark:bg-gray-900">
            <Icon className="h-3 w-3 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              {getTypeLabel()}
            </span>
          </div>
          <h3 className="text-sm font-bold text-black dark:text-white">
            {title}
          </h3>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="flex-shrink-0 rounded-lg p-1.5 text-gray-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-950/20 dark:hover:text-red-400"
            aria-label="Remove memory"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      <p className="mb-3 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
        {content}
      </p>

      {timestamp && (
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <ClockIcon className="h-3 w-3" />
          {new Date(timestamp).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default MemoryCard;

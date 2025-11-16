/**
 * MemoryBadge Component
 * Modern memory usage indicator with black & white theme
 */

'use client';

import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface MemoryBadgeProps {
  usage: number;
  limit: number;
  type?: 'tokens' | 'messages' | 'percentage';
  compact?: boolean;
}

const MemoryBadge: React.FC<MemoryBadgeProps> = ({
  usage,
  limit,
  type = 'percentage',
  compact = false,
}) => {
  const percentage = (usage / limit) * 100;
  
  const getStatus = () => {
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'high';
  };

  const getStyles = () => {
    const status = getStatus();
    
    switch (status) {
      case 'low':
        return {
          badge: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300',
          bar: 'bg-gray-700 dark:bg-gray-300',
        };
      case 'medium':
        return {
          badge: 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20 dark:text-yellow-400',
          bar: 'bg-yellow-600 dark:bg-yellow-400',
        };
      case 'high':
        return {
          badge: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400',
          bar: 'bg-red-600 dark:bg-red-400',
        };
    }
  };

  const displayValue = () => {
    switch (type) {
      case 'tokens':
        return `${usage.toLocaleString()} / ${limit.toLocaleString()} tokens`;
      case 'messages':
        return `${usage} / ${limit} messages`;
      case 'percentage':
      default:
        return `${percentage.toFixed(1)}%`;
    }
  };

  const styles = getStyles();
  const status = getStatus();

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${styles.badge}`}>
        <span className={`inline-block h-2 w-2 rounded-full ${styles.bar}`} />
        {displayValue()}
        {status === 'high' && <ExclamationTriangleIcon className="h-3 w-3" />}
      </span>
    );
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${styles.badge}`}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Context Usage</span>
          {status === 'high' && (
            <ExclamationTriangleIcon className="h-4 w-4" />
          )}
        </div>
        <span className="text-sm font-bold">{displayValue()}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${styles.bar}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {status === 'high' && (
        <p className="mt-2 text-xs">
          Memory usage is high. Consider clearing old memories.
        </p>
      )}
    </div>
  );
};

export default MemoryBadge;

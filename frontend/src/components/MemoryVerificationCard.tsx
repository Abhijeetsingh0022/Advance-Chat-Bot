/**
 * MemoryVerificationCard Component
 * Modern memory verification with black & white theme
 */

'use client';

import React, { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  PencilSquareIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

interface MemoryVerificationCardProps {
  id: string;
  content: string;
  memoryType: string;
  category?: string;
  confidenceScore: number;
  createdAt: string;
  status?: 'pending' | 'confirmed' | 'rejected' | 'corrected';
  verifiedAt?: string;
  onVerify: (memoryId: string, action: 'confirm' | 'reject' | 'correct', correctedContent?: string, feedback?: string) => Promise<void>;
  compact?: boolean;
}

const MemoryVerificationCard: React.FC<MemoryVerificationCardProps> = ({
  id,
  content,
  memoryType,
  category,
  confidenceScore,
  createdAt,
  status = 'pending',
  verifiedAt,
  onVerify,
  compact = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onVerify(id, 'confirm', undefined, feedback || undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onVerify(id, 'reject', undefined, feedback || undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrect = async () => {
    if (editedContent.trim() === content.trim()) {
      setIsEditing(false);
      return;
    }
    
    setLoading(true);
    try {
      await onVerify(id, 'correct', editedContent, feedback || undefined);
      setIsEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-black dark:bg-gray-900 dark:text-white">
            <CheckCircleSolidIcon className="h-3 w-3" />
            Confirmed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
            <XCircleIcon className="h-3 w-3" />
            Rejected
          </span>
        );
      case 'corrected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-800 dark:text-gray-200">
            <PencilSquareIcon className="h-3 w-3" />
            Corrected
          </span>
        );
      default:
        return (
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
            <ClockIcon className="h-3 w-3" />
            Pending
          </span>
        );
    }
  };

  if (compact) {
    return (
      <div className="rounded-lg border-2 border-gray-200 bg-white p-3 shadow-sm transition-all hover:border-black hover:shadow-md dark:border-gray-800 dark:bg-black dark:hover:border-white">
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              {getStatusBadge()}
              <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                {memoryType}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-gray-800 dark:text-gray-200">
              {content}
            </p>
          </div>
        </div>

        {status === 'pending' && (
          <div className="mt-2 flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-2 py-1 text-xs font-medium text-black transition-all hover:border-black hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-gray-900"
            >
              <CheckCircleIcon className="h-3 w-3" />
              Confirm
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-red-500 bg-white px-2 py-1 text-xs font-medium text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/20"
            >
              <XCircleIcon className="h-3 w-3" />
              Reject
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 shadow-lg transition-all hover:border-black hover:shadow-2xl dark:border-gray-800 dark:bg-black dark:hover:border-white">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-black p-2 dark:bg-white">
            <SparklesIcon className="h-5 w-5 text-white dark:text-black" />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              {getStatusBadge()}
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {memoryType}
              </span>
              {category && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  • {category}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <ClockIcon className="h-3 w-3" />
              {new Date(createdAt).toLocaleString()}
              {verifiedAt && (
                <span className="text-gray-400">
                  • Verified {new Date(verifiedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="flex flex-col items-end">
          <span className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">
            Confidence
          </span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-black transition-all dark:bg-white"
                style={{ width: `${confidenceScore * 100}%` }}
              />
            </div>
            <span className="text-xs font-bold text-black dark:text-white">
              {Math.round(confidenceScore * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="mb-4 space-y-3">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full resize-none rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            rows={3}
            placeholder="Edit memory content..."
          />
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full resize-none rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white/10"
            rows={2}
            placeholder="Optional: Add feedback about why you corrected this..."
          />
        </div>
      ) : (
        <div className="mb-4">
          <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
            {content}
          </p>
        </div>
      )}

      {/* Actions */}
      {status === 'pending' && (
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCorrect}
                disabled={loading || !editedContent.trim()}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Save Correction
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(content);
                  setFeedback('');
                }}
                disabled={loading}
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all hover:border-black hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-gray-900"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              >
                <CheckCircleIcon className="h-4 w-4" />
                {loading ? 'Confirming...' : 'Confirm Correct'}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-black transition-all hover:border-black hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-gray-900"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-red-500 bg-white px-4 py-2.5 text-sm font-semibold text-red-600 transition-all hover:bg-red-50 disabled:opacity-50 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/20"
              >
                <XCircleIcon className="h-4 w-4" />
                Reject
              </button>
            </>
          )}
        </div>
      )}

      {/* Verified Status Info */}
      {status !== 'pending' && verifiedAt && (
        <div className="mt-3 border-t-2 border-gray-200 pt-3 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Verified on {new Date(verifiedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default MemoryVerificationCard;

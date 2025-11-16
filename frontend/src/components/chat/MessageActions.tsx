/**
 * MessageActions Component
 * Modern action buttons with black & white theme
 */

'use client';

import React, { useState } from 'react';
import {
  ClipboardDocumentIcon,
  SpeakerWaveIcon,
  ArrowPathIcon,
  TrashIcon,
  HeartIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { BranchControls } from '@/components/BranchControls';
import { useAIConfig } from '@/context/AIConfigContext';

interface MessageActionsProps {
  messageId: string;
  messageRole: 'user' | 'assistant';
  messageContent: string;
  isFavorite: boolean;
  sessionId?: string | null;
  currentModel?: string;
  onCopy: () => void;
  onSpeak?: () => void;
  onRegenerate?: () => void;
  onRegenerateWithModel?: (modelId: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onBranchCreated?: () => void;
}

export function MessageActions({
  messageId,
  messageRole,
  messageContent,
  isFavorite,
  sessionId,
  currentModel,
  onCopy,
  onSpeak,
  onRegenerate,
  onRegenerateWithModel,
  onDelete,
  onToggleFavorite,
  onBranchCreated,
}: MessageActionsProps) {
  const [showModelMenu, setShowModelMenu] = useState(false);
  const { models } = useAIConfig();

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Copy */}
      <button
        onClick={onCopy}
        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900"
        title="Copy message"
        aria-label="Copy message"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
      </button>

      {/* Assistant-specific actions */}
      {messageRole === 'assistant' && (
        <>
          {/* Read aloud */}
          {onSpeak && (
            <button
              onClick={onSpeak}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900"
              title="Read aloud"
              aria-label="Read aloud"
            >
              <SpeakerWaveIcon className="h-4 w-4" />
            </button>
          )}

          {/* Regenerate with Model Selection */}
          {(onRegenerate || onRegenerateWithModel) && (
            <div className="relative">
              <button
                onClick={onRegenerate}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setShowModelMenu(!showModelMenu);
                }}
                className="group flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-gray-700 shadow-sm transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900"
                title="Regenerate response (right-click for model selection)"
                aria-label="Regenerate response"
              >
                <ArrowPathIcon className="h-4 w-4" />
                <ChevronDownIcon
                  className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowModelMenu(!showModelMenu);
                  }}
                />
              </button>

              {/* Model Selection Dropdown */}
              {showModelMenu && onRegenerateWithModel && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowModelMenu(false)}
                  />
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                    <div className="max-h-80 overflow-y-auto p-2">
                      <div className="mb-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Regenerate with Model
                      </div>
                      {models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onRegenerateWithModel(model.id);
                            setShowModelMenu(false);
                          }}
                          className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                            currentModel === model.id
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{model.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {model.provider} • {model.type}
                              </div>
                            </div>
                            {currentModel === model.id && (
                              <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Branch controls for user messages */}
      {messageRole === 'user' && sessionId && onBranchCreated && (
        <BranchControls
          sessionId={sessionId}
          messageId={messageId}
          messageContent={messageContent}
          onBranchCreated={onBranchCreated}
        />
      )}

      {/* Favorite toggle */}
      <button
        onClick={onToggleFavorite}
        className={[
          'rounded-lg border p-2 shadow-sm transition-all',
          isFavorite
            ? 'border-black bg-black text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200'
            : 'border-gray-200 bg-white text-gray-700 hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900',
        ].join(' ')}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? (
          <HeartIconSolid className="h-4 w-4" />
        ) : (
          <HeartIcon className="h-4 w-4" />
        )}
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="group rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-red-500 hover:bg-red-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-red-500 dark:hover:bg-red-950/20"
        title="Delete message"
        aria-label="Delete message"
      >
        <TrashIcon className="h-4 w-4 transition-colors group-hover:text-red-500" />
      </button>
    </div>
  );
}

// Optional: Vertical layout for better mobile/compact views
export function MessageActionsVertical({
  messageId,
  messageRole,
  messageContent,
  isFavorite,
  sessionId,
  onCopy,
  onSpeak,
  onRegenerate,
  onDelete,
  onToggleFavorite,
  onBranchCreated,
}: MessageActionsProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Copy */}
      <button
        onClick={onCopy}
        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900"
        title="Copy message"
        aria-label="Copy message"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
      </button>

      {/* Assistant actions */}
      {messageRole === 'assistant' && (
        <>
          {onSpeak && (
            <button
              onClick={onSpeak}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900"
              title="Read aloud"
              aria-label="Read aloud"
            >
              <SpeakerWaveIcon className="h-4 w-4" />
            </button>
          )}

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900"
              title="Regenerate response"
              aria-label="Regenerate response"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      {/* Branch controls */}
      {messageRole === 'user' && sessionId && onBranchCreated && (
        <div className="rounded-lg border border-gray-200 bg-white p-1 dark:border-gray-800 dark:bg-black">
          <BranchControls
            sessionId={sessionId}
            messageId={messageId}
            messageContent={messageContent}
            onBranchCreated={onBranchCreated}
          />
        </div>
      )}

      {/* Favorite */}
      <button
        onClick={onToggleFavorite}
        className={[
          'rounded-lg border p-2 shadow-sm transition-all',
          isFavorite
            ? 'border-black bg-black text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-200'
            : 'border-gray-200 bg-white text-gray-700 hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-white dark:hover:bg-gray-900',
        ].join(' ')}
        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      >
        {isFavorite ? (
          <HeartIconSolid className="h-4 w-4" />
        ) : (
          <HeartIcon className="h-4 w-4" />
        )}
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="group rounded-lg border border-gray-200 bg-white p-2 text-gray-700 shadow-sm transition-all hover:border-red-500 hover:bg-red-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-red-500 dark:hover:bg-red-950/20"
        title="Delete message"
        aria-label="Delete message"
      >
        <TrashIcon className="h-4 w-4 transition-colors group-hover:text-red-500" />
      </button>
    </div>
  );
}

// Optional: Compact single-row layout
export function MessageActionsCompact({
  messageId,
  messageRole,
  messageContent,
  isFavorite,
  sessionId,
  onCopy,
  onSpeak,
  onRegenerate,
  onDelete,
  onToggleFavorite,
  onBranchCreated,
}: MessageActionsProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-black">
      {/* Copy */}
      <button
        onClick={onCopy}
        className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
        title="Copy"
        aria-label="Copy"
      >
        <ClipboardDocumentIcon className="h-4 w-4" />
      </button>

      {/* Assistant actions */}
      {messageRole === 'assistant' && (
        <>
          {onSpeak && (
            <button
              onClick={onSpeak}
              className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
              title="Speak"
              aria-label="Speak"
            >
              <SpeakerWaveIcon className="h-4 w-4" />
            </button>
          )}

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
              title="Regenerate"
              aria-label="Regenerate"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
        </>
      )}

      {/* Divider */}
      <div className="h-4 w-px bg-gray-200 dark:bg-gray-800" />

      {/* Favorite */}
      <button
        onClick={onToggleFavorite}
        className="rounded p-1.5 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-900"
        title={isFavorite ? 'Unfavorite' : 'Favorite'}
        aria-label={isFavorite ? 'Unfavorite' : 'Favorite'}
      >
        {isFavorite ? (
          <HeartIconSolid className="h-4 w-4 text-black dark:text-white" />
        ) : (
          <HeartIcon className="h-4 w-4" />
        )}
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="group rounded p-1.5 text-gray-700 transition-colors hover:bg-red-50 dark:text-gray-300 dark:hover:bg-red-950/20"
        title="Delete"
        aria-label="Delete"
      >
        <TrashIcon className="h-4 w-4 transition-colors group-hover:text-red-500" />
      </button>
    </div>
  );
}

/**
 * TypingIndicator Component
 * Modern typing indicator with black & white theme
 */

'use client';

import React from 'react';
import { SparklesIcon, BoltIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import CodeBlock from '@/components/CodeBlock';

interface TypingIndicatorProps {
  aiModelName: string;
  streamingMessage?: string;
  loadingTime?: number;
  isToolCallActive?: boolean;
}

export function TypingIndicator({
  aiModelName,
  streamingMessage,
  loadingTime = 0,
  isToolCallActive = false,
}: TypingIndicatorProps) {
  return (
    <div className="flex animate-fade-in justify-start">
      <div className="flex max-w-[85%] items-start gap-3 md:max-w-[75%]">
        {/* Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black shadow-sm dark:bg-white">
          <SparklesIcon className="h-6 w-6 animate-pulse text-white dark:text-black" />
        </div>

        {/* Message Container */}
        <div className="flex-1">
          {/* Model Name */}
          <div className="mb-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
            {aiModelName}
          </div>

          {/* Message Bubble */}
          <div className="rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-black">
            {streamingMessage ? (
              /* Streaming Content */
              <div className="message-content prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code: CodeBlock as any,
                    p: ({ children }) => (
                      <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>
                    ),
                  }}
                >
                  {streamingMessage}
                </ReactMarkdown>
                {/* Cursor */}
                <span className="inline-block h-4 w-0.5 animate-pulse bg-black dark:bg-white" />
              </div>
            ) : (
              /* Loading State */
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Bouncing Dots */}
                  <div className="flex space-x-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white" />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  {/* Status Text */}
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {isToolCallActive ? 'Using tools...' : 'Thinking...'}
                  </span>
                </div>

                {/* Timer */}
                {loadingTime > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
                    <BoltIcon className="h-3.5 w-3.5" />
                    <span>{loadingTime}s</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Alternative: Minimal typing indicator for compact spaces
export function TypingIndicatorCompact() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex space-x-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black dark:bg-white" />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-black dark:bg-white"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-black dark:bg-white"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-xs text-gray-600 dark:text-gray-400">AI is typing...</span>
    </div>
  );
}

// Alternative: Inline streaming indicator
export function StreamingIndicator({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {text}
          <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-black dark:bg-white" />
        </div>
      </div>
    </div>
  );
}

// Alternative: Tool call indicator with progress
export function ToolCallIndicator({
  toolName,
  progress,
}: {
  toolName: string;
  progress?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-black">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
        <BoltIcon className="h-5 w-5 animate-pulse text-white dark:text-black" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-black dark:text-white">
          Using {toolName}
        </div>
        {progress !== undefined && (
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full bg-black transition-all dark:bg-white"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

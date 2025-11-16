/**
 * MessageItem Component
 * Modern message display with black & white theme
 */

'use client';

import React, { memo } from 'react';
import { UserCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatDistanceToNow } from 'date-fns';
import CodeBlock from '@/components/CodeBlock';
import ToolsPanel from '@/components/ToolsPanel';
import MessageReactions from '@/components/MessageReactions';
import MemoryBadgeEnhanced from '@/components/memory/MemoryBadgeEnhanced';
import { MessageActions } from './MessageActions';
import { Message } from '@/types/chat';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface MessageItemProps {
  message: Message;
  isHovered: boolean;
  isFavorite: boolean;
  sessionId: string | null;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onCopy: () => void;
  onSpeak: () => void;
  onRegenerate: () => void;
  onRegenerateWithModel?: (modelId: string) => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onBranchCreated: () => void;
}

const MessageItemComponent = ({
  message,
  isHovered,
  isFavorite,
  sessionId,
  onMouseEnter,
  onMouseLeave,
  onCopy,
  onSpeak,
  onRegenerate,
  onRegenerateWithModel,
  onDelete,
  onToggleFavorite,
  onBranchCreated,
}: MessageItemProps) => {
  const isUser = message.role === 'user';

  const handleVerifyMemory = async (memoryId: string, action: 'confirm' | 'reject') => {
    try {
      await api.memory.verifyMemory(memoryId, {
        status: action === 'confirm' ? 'confirmed' : 'rejected',
      });
      toast.success(`Memory ${action}ed successfully`);
      // Optionally refresh the message or memories list
    } catch (error) {
      console.error('Failed to verify memory:', error);
      toast.error('Failed to verify memory');
    }
  };

  const handleViewRelated = (memoryId: string) => {
    // Open memory dashboard with related memories
    window.open(`/memory?view=${memoryId}`, '_blank');
  };

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="group relative max-w-[95%] sm:max-w-[90%] md:max-w-[85%] lg:max-w-[75%] xl:max-w-[70%]">
        {/* Avatar/Icon */}
        <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl shadow-sm ${
              isUser
                ? 'bg-gray-800 dark:bg-gray-200'
                : 'bg-black dark:bg-white'
            }`}
          >
            {isUser ? (
              <UserCircleIcon className="h-6 w-6 text-white dark:text-black" />
            ) : (
              <SparklesIcon className="h-6 w-6 text-white dark:text-black" />
            )}
          </div>

          {/* Message Bubble */}
          <div className="min-w-0 flex-1">
            {/* Message Header with timestamp */}
            <div className={`mb-2 flex items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {isUser ? 'You' : 'AI Assistant'}
              </span>
              {!isUser && message.metadata?.model && (
                <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  <SparklesIcon className="h-3 w-3" />
                  {message.metadata.model}
                </span>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-500">
                {(() => {
                  try {
                    const timestamp = message.created_at || new Date().toISOString();
                    const date = new Date(timestamp);
                    if (isNaN(date.getTime())) {
                      return 'just now';
                    }
                    return formatDistanceToNow(date, { addSuffix: true });
                  } catch {
                    return 'just now';
                  }
                })()}
              </span>
            </div>

            {/* Message Content Bubble */}
            <div
              className={`message-bubble rounded-2xl border px-5 py-4 shadow-sm transition-all ${
                isUser
                  ? 'border-gray-800 bg-black text-white dark:border-gray-200 dark:bg-white dark:text-black'
                  : 'border-gray-200 bg-white text-black dark:border-gray-800 dark:bg-black dark:text-white'
              } ${isHovered ? 'shadow-md' : 'shadow-sm'}`}
            >
              {/* Message Content */}
              <div className="message-content leading-relaxed">
                {message.content && message.content.trim() ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className={`prose prose-sm max-w-none ${
                      isUser
                        ? 'prose-invert dark:prose'
                        : 'prose dark:prose-invert'
                    }`}
                    components={{
                      code: CodeBlock as any,
                      p: ({ children }) => (
                        <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>
                      ),
                      div: ({ children }) => (
                        <div className="whitespace-pre-wrap">{children}</div>
                      ),
                      span: ({ children }) => (
                        <span className="whitespace-pre-wrap">{children}</span>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  <div className="py-2 font-semibold text-red-500 dark:text-red-400">
                    ⚠️ Empty response - No content available
                  </div>
                )}
              </div>

              {/* Used Memories */}
              {!isUser &&
                message.metadata?.used_memories &&
                message.metadata.used_memories.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {message.metadata.used_memories.length} {message.metadata.used_memories.length === 1 ? 'memory' : 'memories'} used
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {message.metadata.used_memories.map((memory: any, idx: number) => (
                        <span
                          key={memory.id || idx}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                          title={memory.content}
                        >
                          {memory.memory_type || 'note'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Tool Results */}
              {!isUser &&
                message.metadata?.tool_results &&
                message.metadata.tool_results.length > 0 && (
                  <ToolsPanel
                    toolResults={message.metadata.tool_results}
                    isExpanded={false}
                  />
                )}

              {/* Message Reactions */}
              {!isUser && <MessageReactions messageId={message.id} />}

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.attachments.map((attachment, index) => (
                    <div key={attachment.id || `attachment_${index}_${attachment.filename}`}>
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm transition-all hover:border-gray-400 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-gray-600 dark:hover:bg-gray-900"
                      >
                        <span>{attachment.filename}</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Message Actions - Show on hover */}
        {isHovered && (
          <div
            className={`absolute top-12 ${
              isUser ? 'left-0 -translate-x-full pl-2' : 'right-0 translate-x-full pr-2'
            }`}
          >
            <MessageActions
              messageId={message.id}
              messageRole={message.role as 'user' | 'assistant'}
              messageContent={message.content}
              isFavorite={isFavorite}
              sessionId={sessionId}
              currentModel={message.metadata?.model}
              onCopy={onCopy}
              onSpeak={!isUser ? onSpeak : undefined}
              onRegenerate={!isUser ? onRegenerate : undefined}
              onRegenerateWithModel={!isUser ? onRegenerateWithModel : undefined}
              onDelete={onDelete}
              onToggleFavorite={onToggleFavorite}
              onBranchCreated={onBranchCreated}
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Export memoized version to prevent unnecessary re-renders
export const MessageItem = memo(MessageItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isFavorite === nextProps.isFavorite
  );
});

MessageItem.displayName = 'MessageItem';

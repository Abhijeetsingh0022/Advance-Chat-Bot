/**
 * MessageList Component
 * Optimized message list with black & white theme
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MessageItem } from './MessageItem';
import { EmptyState } from './EmptyState';
import { TypingIndicator } from './TypingIndicator';
import { ChatLoadingSkeleton } from './LoadingSkeleton';
import { Message } from '@/types/chat';

interface MessageListProps {
  messages: Message[];
  loading: boolean;
  isTyping: boolean;
  streamingMessage: string | null;
  aiModelName: string;
  loadingTime: number;
  isToolCallActive: boolean;
  sessionId: string | null;
  onQuickAction: (prompt: string) => void;
  onMessageCopy: (messageId: string) => void;
  onMessageSpeak: (messageId: string) => void;
  onMessageRegenerate: (messageId: string) => void;
  onMessageRegenerateWithModel?: (messageId: string, modelId: string) => void;
  onMessageDelete: (messageId: string) => void;
  onMessageFavorite: (messageId: string) => void;
  onBranchCreated: () => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  loading,
  isTyping,
  streamingMessage,
  aiModelName,
  loadingTime,
  isToolCallActive,
  sessionId,
  onQuickAction,
  onMessageCopy,
  onMessageSpeak,
  onMessageRegenerate,
  onMessageRegenerateWithModel,
  onMessageDelete,
  onMessageFavorite,
  onBranchCreated,
}) => {
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<Set<string>>(new Set());

  // Handle favorite toggle
  const handleToggleFavorite = useCallback(
    (messageId: string) => {
      setFavoriteMessageIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(messageId)) {
          newSet.delete(messageId);
        } else {
          newSet.add(messageId);
        }
        return newSet;
      });
      onMessageFavorite(messageId);
    },
    [onMessageFavorite]
  );

  // Mouse handlers
  const handleMouseEnter = useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredMessageId(null);
  }, []);

  // Memoize message handlers
  const messageHandlers = useMemo(
    () => ({
      onCopy: onMessageCopy,
      onSpeak: onMessageSpeak,
      onRegenerate: onMessageRegenerate,
      onDelete: onMessageDelete,
      onToggleFavorite: handleToggleFavorite,
      onBranchCreated,
    }),
    [
      onMessageCopy,
      onMessageSpeak,
      onMessageRegenerate,
      onMessageDelete,
      handleToggleFavorite,
      onBranchCreated,
    ]
  );

  // Show loading skeleton
  if (loading) {
    return <ChatLoadingSkeleton />;
  }

  // Show empty state
  if (messages.length === 0 && !isTyping) {
    return <EmptyState onQuickAction={onQuickAction} />;
  }

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-950">
      {/* Messages Container */}
      <div className="w-full space-y-6 px-2 py-6 sm:px-3 lg:px-4">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isHovered={hoveredMessageId === message.id}
            isFavorite={favoriteMessageIds.has(message.id)}
            sessionId={sessionId}
            onMouseEnter={() => handleMouseEnter(message.id)}
            onMouseLeave={handleMouseLeave}
            onCopy={() => messageHandlers.onCopy(message.id)}
            onSpeak={() => messageHandlers.onSpeak(message.id)}
            onRegenerate={() => messageHandlers.onRegenerate(message.id)}
            onRegenerateWithModel={onMessageRegenerateWithModel ? (modelId) => onMessageRegenerateWithModel(message.id, modelId) : undefined}
            onDelete={() => messageHandlers.onDelete(message.id)}
            onToggleFavorite={() => messageHandlers.onToggleFavorite(message.id)}
            onBranchCreated={messageHandlers.onBranchCreated}
          />
        ))}
      </div>

      {/* Typing Indicator */}
      {isTyping && (
        <div className="w-full px-2 pb-6 sm:px-3 lg:px-4">
          <TypingIndicator
            aiModelName={aiModelName}
            streamingMessage={streamingMessage || undefined}
            loadingTime={loadingTime}
            isToolCallActive={isToolCallActive}
          />
        </div>
      )}
    </div>
  );
};

// Optional: Add message grouping by date
export const MessageListGrouped: React.FC<MessageListProps> = (props) => {
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';
    let currentGroup: Message[] = [];

    props.messages.forEach((message) => {
      const messageDate = new Date(message.created_at || Date.now()).toLocaleDateString();

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [props.messages]);

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [favoriteMessageIds, setFavoriteMessageIds] = useState<Set<string>>(new Set());

  const handleToggleFavorite = useCallback(
    (messageId: string) => {
      setFavoriteMessageIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(messageId)) {
          newSet.delete(messageId);
        } else {
          newSet.add(messageId);
        }
        return newSet;
      });
      props.onMessageFavorite(messageId);
    },
    [props]
  );

  const handleMouseEnter = useCallback((messageId: string) => {
    setHoveredMessageId(messageId);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredMessageId(null);
  }, []);

  if (props.loading) {
    return <ChatLoadingSkeleton />;
  }

  if (props.messages.length === 0 && !props.isTyping) {
    return <EmptyState onQuickAction={props.onQuickAction} />;
  }

  return (
    <div className="h-full w-full bg-gray-50 dark:bg-gray-950">
      <div className="w-full space-y-8 px-2 py-6 sm:px-3 lg:px-4">
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex} className="space-y-6">
            {/* Date separator */}
            <div className="flex items-center justify-center">
              <div className="rounded-full border border-gray-200 bg-white px-4 py-1 text-xs font-medium text-gray-600 shadow-sm dark:border-gray-800 dark:bg-black dark:text-gray-400">
                {group.date}
              </div>
            </div>

            {/* Messages for this date */}
            <div className="space-y-6">
              {group.messages.map((message) => (
                <MessageItem
                  key={message.id}
                  message={message}
                  isHovered={hoveredMessageId === message.id}
                  isFavorite={favoriteMessageIds.has(message.id)}
                  sessionId={props.sessionId}
                  onMouseEnter={() => handleMouseEnter(message.id)}
                  onMouseLeave={handleMouseLeave}
                  onCopy={() => props.onMessageCopy(message.id)}
                  onSpeak={() => props.onMessageSpeak(message.id)}
                  onRegenerate={() => props.onMessageRegenerate(message.id)}
                  onDelete={() => props.onMessageDelete(message.id)}
                  onToggleFavorite={() => handleToggleFavorite(message.id)}
                  onBranchCreated={props.onBranchCreated}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Typing Indicator */}
      {props.isTyping && (
        <div className="w-full px-2 pb-6 sm:px-3 lg:px-4">
          <TypingIndicator
            aiModelName={props.aiModelName}
            streamingMessage={props.streamingMessage || undefined}
            loadingTime={props.loadingTime}
            isToolCallActive={props.isToolCallActive}
          />
        </div>
      )}
    </div>
  );
};

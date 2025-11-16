/**
 * MessageReactions Component
 * Emoji reactions and feedback for messages
 */

'use client';

import React, { useState } from 'react';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface MessageReactionsProps {
  reactions?: Reaction[];
  messageId: string;
  onAddReaction?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  compact?: boolean;
}

const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions = [],
  messageId,
  onAddReaction,
  onRemoveReaction,
  compact = false,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  const commonReactions = ['👍', '❤️', '😂', '🤔', '👌'];

  const handleReactionClick = (emoji: string) => {
    const existingReaction = reactions.find((r) => r.emoji === emoji);
    if (existingReaction?.userReacted) {
      onRemoveReaction?.(messageId, emoji);
    } else {
      onAddReaction?.(messageId, emoji);
    }
    setShowPicker(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {reactions.map((reaction) => (
          <button
            key={reaction.emoji}
            onClick={() => handleReactionClick(reaction.emoji)}
            className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
              reaction.userReacted
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-1">{reaction.emoji}</span>
            {reaction.count > 1 && <span>{reaction.count}</span>}
          </button>
        ))}
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          title="Add reaction"
        >
          +
        </button>

        {showPicker && (
          <div className="absolute mt-2 p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 flex gap-1">
            {commonReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="text-lg hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji)}
          className={`px-3 py-1.5 rounded-full font-medium transition-all ${
            reaction.userReacted
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <span className="mr-1">{reaction.emoji}</span>
          {reaction.count}
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          title="Add reaction"
        >
          +
        </button>

        {showPicker && (
          <div className="absolute top-full mt-2 p-3 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 grid grid-cols-5 gap-2 z-50">
            {commonReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className="text-2xl hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageReactions;

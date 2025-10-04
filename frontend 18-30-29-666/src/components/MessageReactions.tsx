'use client';

import { useState } from 'react';
import { HandThumbUpIcon, HandThumbDownIcon, HeartIcon, FaceSmileIcon, QuestionMarkCircleIcon, StarIcon } from '@heroicons/react/24/outline';
import { HandThumbUpIcon as HandThumbUpIconSolid, HandThumbDownIcon as HandThumbDownIconSolid, HeartIcon as HeartIconSolid, FaceSmileIcon as FaceSmileIconSolid, QuestionMarkCircleIcon as QuestionMarkCircleIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { chatAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface MessageReactionsProps {
  messageId: string;
  reactions?: {
    like: number;
    dislike: number;
    love?: number;
    laugh?: number;
    confused?: number;
  };
  userReaction?: string;
  rating?: number;
  onReactionUpdate?: () => void;
}

export default function MessageReactions({ messageId, reactions, userReaction, rating, onReactionUpdate }: MessageReactionsProps) {
  const [showRating, setShowRating] = useState(false);
  const [currentRating, setCurrentRating] = useState(rating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);

  const reactionButtons = [
    { type: 'like', Icon: HandThumbUpIcon, IconSolid: HandThumbUpIconSolid, label: 'Like', color: 'text-blue-500' },
    { type: 'dislike', Icon: HandThumbDownIcon, IconSolid: HandThumbDownIconSolid, label: 'Dislike', color: 'text-red-500' },
    { type: 'love', Icon: HeartIcon, IconSolid: HeartIconSolid, label: 'Love', color: 'text-pink-500' },
    { type: 'laugh', Icon: FaceSmileIcon, IconSolid: FaceSmileIconSolid, label: 'Laugh', color: 'text-yellow-500' },
    { type: 'confused', Icon: QuestionMarkCircleIcon, IconSolid: QuestionMarkCircleIconSolid, label: 'Confused', color: 'text-purple-500' },
  ];

  const handleReaction = async (reactionType: string) => {
    try {
      await chatAPI.addReaction(messageId, reactionType);
      toast.success(`Reaction added`);
      if (onReactionUpdate) onReactionUpdate();
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const handleRating = async (stars: number) => {
    try {
      await chatAPI.rateMessage(messageId, stars);
      setCurrentRating(stars);
      setShowRating(false);
      toast.success(`Rated ${stars} stars`);
      if (onReactionUpdate) onReactionUpdate();
    } catch (error) {
      toast.error('Failed to rate message');
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2">
      {/* Reaction Buttons */}
      <div className="flex items-center gap-1">
        {reactionButtons.map(({ type, Icon, IconSolid, label, color }) => {
          const isActive = userReaction === type;
          const count = reactions?.[type as keyof typeof reactions] || 0;
          const DisplayIcon = isActive ? IconSolid : Icon;

          return (
            <button
              key={type}
              onClick={() => handleReaction(type)}
              className={`px-2 py-1 rounded-lg backdrop-blur-xl transition-all hover:scale-110 ${
                isActive
                  ? 'bg-black/10 dark:bg-white/10 scale-110'
                  : 'bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70'
              }`}
            >
              <div className="flex items-center gap-1">
                <DisplayIcon className={`w-4 h-4 ${isActive ? color : 'text-gray-600 dark:text-gray-400'}`} />
                {count > 0 && (
                  <span className={`text-xs font-semibold ${isActive ? color : 'text-gray-600 dark:text-gray-400'}`}>
                    {count}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Rating */}
      <div className="relative">
        <button
          onClick={() => setShowRating(!showRating)}
          className="px-2 py-1 rounded-lg backdrop-blur-xl bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all hover:scale-110"
          title="Rate this response"
        >
          <div className="flex items-center gap-1">
            {currentRating > 0 ? (
              <StarIconSolid className="w-4 h-4 text-yellow-500" />
            ) : (
              <StarIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
            {currentRating > 0 && (
              <span className="text-xs font-semibold text-yellow-500">{currentRating}</span>
            )}
          </div>
        </button>

        {/* Rating Dropdown */}
        {showRating && (
          <div className="absolute bottom-full left-0 mb-2 px-3 py-2 rounded-xl backdrop-blur-xl bg-white/90 dark:bg-black/90 border border-gray-200/50 dark:border-gray-800/50 shadow-2xl animate-fade-in z-10">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isHovered = hoveredStar >= star;
                const isRated = currentRating >= star;
                const DisplayIcon = isHovered || isRated ? StarIconSolid : StarIcon;

                return (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-125"
                  >
                    <DisplayIcon
                      className={`w-6 h-6 ${
                        isHovered || isRated ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-center">
              Rate this response
            </p>
          </div>
        )}
      </div>

      {/* Total Reactions Count */}
      {reactions && Object.values(reactions).some(count => count > 0) && (
        <span className="text-xs text-gray-500 dark:text-gray-500 ml-2">
          {Object.values(reactions).reduce((sum, count) => sum + count, 0)} reactions
        </span>
      )}
    </div>
  );
}

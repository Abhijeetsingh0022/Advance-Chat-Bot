/**
 * EmptyState Component
 * Modern welcome screen with black & white theme
 */

'use client';

import React from 'react';
import { SparklesIcon, CodeBracketIcon, PencilSquareIcon, ChartBarIcon, LightBulbIcon } from '@heroicons/react/24/outline';

interface EmptyStateProps {
  onQuickAction: (prompt: string) => void;
}

export function EmptyState({ onQuickAction }: EmptyStateProps) {
  const quickActions = [
    { 
      icon: CodeBracketIcon, 
      text: 'Help me code', 
      prompt: 'Can you help me write some code?',
      description: 'Debug, optimize, or build new features'
    },
    { 
      icon: PencilSquareIcon, 
      text: 'Write content', 
      prompt: 'I need help writing content',
      description: 'Articles, emails, or creative writing'
    },
    { 
      icon: ChartBarIcon, 
      text: 'Analyze data', 
      prompt: 'Can you help me analyze some data?',
      description: 'Insights, patterns, and visualizations'
    },
    { 
      icon: LightBulbIcon, 
      text: 'Get creative', 
      prompt: 'Give me some creative ideas',
      description: 'Brainstorm and ideate together'
    },
  ];

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-3xl text-center">
        {/* Icon */}
        <div className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-black shadow-lg dark:bg-white">
          <SparklesIcon className="h-10 w-10 text-white dark:text-black" />
        </div>

        {/* Title */}
        <h2 className="mb-3 text-3xl font-bold text-black dark:text-white sm:text-4xl">
          Start a Conversation
        </h2>
        
        {/* Subtitle */}
        <p className="mb-12 text-base text-gray-600 dark:text-gray-400 sm:text-lg">
          Ask me anything! I can help with coding, writing, analysis, and more.
        </p>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <button
                key={idx}
                onClick={() => onQuickAction(action.prompt)}
                className="group rounded-xl border border-gray-200 bg-white p-5 text-left transition-all hover:border-black hover:shadow-lg dark:border-gray-800 dark:bg-black dark:hover:border-white sm:p-6"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-black p-2 dark:bg-white">
                    <Icon className="h-5 w-5 text-white dark:text-black" />
                  </div>
                  <h3 className="font-semibold text-black dark:text-white">
                    {action.text}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {action.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="mt-12 text-sm text-gray-500 dark:text-gray-500">
          <p>Or type your message below to begin</p>
        </div>
      </div>
    </div>
  );
}

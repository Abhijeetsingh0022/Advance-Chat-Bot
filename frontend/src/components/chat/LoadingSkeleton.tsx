/**
 * LoadingSkeleton Components
 * Modern loading states with black & white theme
 */

'use client';

import React from 'react';

// Shared animation classes
const pulseAnimation = 'animate-pulse';
const shimmerAnimation = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent';

export function MessageSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-3 md:max-w-[75%]">
        {/* Avatar skeleton */}
        <div className={`h-10 w-10 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
        
        {/* Message content skeleton */}
        <div className="flex-1 space-y-2">
          {/* Name */}
          <div className={`h-3 w-20 rounded bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
          
          {/* Message bubble */}
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-black">
            <div className={`h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
            <div className={`h-3 w-full rounded bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
            <div className={`h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <div className="flex-shrink-0 border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-900 dark:bg-black">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <div className={`h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
          <div className="space-y-2">
            <div className={`h-5 w-32 rounded bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
            <div className={`h-4 w-24 rounded bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
          </div>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className={`h-10 w-20 rounded-lg bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
          <div className={`h-10 w-24 rounded-lg bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
          <div className={`h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
        </div>
      </div>
    </div>
  );
}

export function InputSkeleton() {
  return (
    <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4 dark:border-gray-900 dark:bg-black">
      <div className="flex gap-2">
        <div className={`h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
        <div className={`h-10 flex-1 rounded-xl bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
        <div className={`h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
        <div className={`h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-800 ${pulseAnimation}`} />
      </div>
    </div>
  );
}

export function ChatLoadingSkeleton() {
  return (
    <div className="pointer-events-none flex h-screen flex-col bg-white dark:bg-black">
      <HeaderSkeleton />
      <div className="flex-1 space-y-6 overflow-hidden bg-gray-50 p-6 dark:bg-gray-950">
        <MessageSkeleton />
        <MessageSkeleton />
        <MessageSkeleton />
      </div>
      <InputSkeleton />
    </div>
  );
}

// Shimmer effect for premium loading (optional alternative)
export function MessageSkeletonShimmer() {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] items-start gap-3 md:max-w-[75%]">
        {/* Avatar skeleton */}
        <div className={`h-10 w-10 flex-shrink-0 rounded-xl bg-gray-200 dark:bg-gray-800 ${shimmerAnimation}`} />
        
        {/* Message content skeleton */}
        <div className="flex-1 space-y-2">
          {/* Name */}
          <div className={`h-3 w-20 rounded bg-gray-200 dark:bg-gray-800 ${shimmerAnimation}`} />
          
          {/* Message bubble */}
          <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-black">
            <div className={`h-3 w-3/4 rounded bg-gray-200 dark:bg-gray-800 ${shimmerAnimation}`} />
            <div className={`h-3 w-full rounded bg-gray-200 dark:bg-gray-800 ${shimmerAnimation}`} />
            <div className={`h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-800 ${shimmerAnimation}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal loading indicator for inline use
export function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white" style={{ animationDelay: '150ms' }} />
      <div className="h-2 w-2 animate-bounce rounded-full bg-black dark:bg-white" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

// Spinner for general loading
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-gray-200 border-t-black dark:border-gray-800 dark:border-t-white ${sizeClasses[size]}`} />
    </div>
  );
}

// Full page loader
export function FullPageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
      <div className="space-y-4 text-center">
        <div className="relative mx-auto h-16 w-16">
          <div className="absolute inset-0 animate-pulse rounded-full border-4 border-gray-200 dark:border-gray-800" />
          <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-black dark:border-t-white" />
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{message}</p>
      </div>
    </div>
  );
}

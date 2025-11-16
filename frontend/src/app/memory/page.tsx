/**
 * Memory Management Page
 * Full-featured memory management interface with verification, analytics, and advanced features
 */

'use client';

import React from 'react';
import MemoryDashboard from '@/components/MemoryDashboard';
import { useAuthStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MemoryPage() {
  const { isAuthenticated, token } = useAuthStore();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(true);

  useEffect(() => {
    // Wait for hydration
    setIsLoading(false);
    
    // Check auth after hydration
    if (!isAuthenticated && !token) {
      router.push('/login');
    }
  }, [isAuthenticated, token, router]);

  // Show loading during hydration
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white" />
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Please log in to access memory management
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MemoryDashboard />
      </div>
    </div>
  );
}

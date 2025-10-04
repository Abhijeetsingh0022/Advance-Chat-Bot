/**
 * Profile Layout Component
 * 
 * Provides authentication guard and sidebar layout for profile pages.
 * Features:
 * - Authentication state management
 * - Route protection for unauthenticated users
 * - Sidebar navigation integration
 * - Loading state handling
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import Sidebar from '@/components/Sidebar';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface ProfileLayoutProps {
  children: React.ReactNode;
}

// ============================================================================
// PROFILE LAYOUT COMPONENT
// ============================================================================

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  // ==========================================================================
  // HOOKS AND STATE
  // ==========================================================================
  
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // ==========================================================================
  // AUTHENTICATION GUARD: Redirect unauthenticated users
  // ==========================================================================
  
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // ==========================================================================
  // RENDER PROTECTION: Show loading while redirecting
  // ==========================================================================
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // AUTHENTICATED LAYOUT: Render sidebar with content
  // ==========================================================================
  
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import Sidebar from '@/components/Sidebar';

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, user, token } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    console.log('=== CHAT LAYOUT AUTH CHECK ===');
    console.log('Token:', token ? 'exists' : 'missing');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('User:', user);
    
    // Check authentication on mount
    const checkAuth = () => {
      if (!token) {
        console.log('No token found, redirecting to login...');
        router.push('/login');
      } else {
        console.log('Token found, allowing access to chat');
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [token, router, isAuthenticated, user]);

  if (isChecking || !token) {
    console.log('Showing loading spinner...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <div className="spinner"></div>
      </div>
    );
  }

  console.log('Rendering chat layout');
  return (
    <div className="flex h-screen bg-light-bg dark:bg-dark-bg overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

/**
 * Providers Component
 * Wraps app with all context providers
 */

'use client';

import React from 'react';
import { Toaster } from 'react-hot-toast';
import { AppearanceProvider } from '@/context/AppearanceContext';
import { AIConfigProvider } from '@/context/AIConfigContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppearanceProvider>
        <AIConfigProvider>
          {children}
        </AIConfigProvider>
      </AppearanceProvider>

      {/* Toast notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'var(--toast-bg, #ffffff)',
            color: 'var(--toast-color, #000000)',
            border: '1px solid var(--toast-border, #e5e7eb)',
            borderRadius: '0.75rem',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />

      {/* Global styles for dark mode toasts */}
      <style jsx global>{`
        .dark {
          --toast-bg: #000000;
          --toast-color: #ffffff;
          --toast-border: #27272a;
        }
      `}</style>
    </>
  );
}

import '@/styles/globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ChatBot - AI Assistant',
  description: 'Advanced AI chatbot with multiple providers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--toast-bg)',
                color: 'var(--toast-text)',
                border: '1px solid var(--toast-border)',
                borderRadius: '16px',
                padding: '16px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
                style: {
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#000000',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                },
                className: 'dark:!bg-black/90 dark:!text-white dark:!border-green-500/30',
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
                style: {
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#000000',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                },
                className: 'dark:!bg-black/90 dark:!text-white dark:!border-red-500/30',
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

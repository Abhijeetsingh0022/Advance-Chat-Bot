import '@/styles/globals.css';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/Providers';

// Load Inter font for better typography
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ChatBot - AI Assistant',
  description: 'Advanced conversational AI with real-time streaming and intelligent responses',
  keywords: ['AI', 'ChatBot', 'Assistant', 'Conversation', 'Streaming'],
  authors: [{ name: 'ChatBot Team' }],
  creator: 'ChatBot',
  publisher: 'ChatBot',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://chatbot.example.com',
    title: 'ChatBot - AI Assistant',
    description: 'Advanced conversational AI with real-time streaming',
    siteName: 'ChatBot',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChatBot - AI Assistant',
    description: 'Advanced conversational AI with real-time streaming',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeInitScript = `
    (function() {
      try {
        // Prevent flash of unstyled content
        const html = document.documentElement;
        
        // Load theme mode
        const storedTheme = localStorage.getItem('theme-mode') || 'system';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (storedTheme === 'dark' || (storedTheme === 'system' && prefersDark)) {
          html.classList.add('dark');
        } else {
          html.classList.remove('dark');
        }

        // Load font size
        const fontSize = localStorage.getItem('font-size') || 'medium';
        const fontSizeMap = { 
          small: '14px', 
          medium: '16px', 
          large: '18px' 
        };
        html.style.fontSize = fontSizeMap[fontSize] || '16px';

        // Load message style
        const messageStyle = localStorage.getItem('message-style') || 'rounded';
        html.setAttribute('data-message-style', messageStyle);

        // Load compact mode
        const compactMode = localStorage.getItem('compact-mode') === 'true';
        if (compactMode) {
          html.classList.add('compact-mode');
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          const currentTheme = localStorage.getItem('theme-mode') || 'system';
          if (currentTheme === 'system') {
            if (e.matches) {
              html.classList.add('dark');
            } else {
              html.classList.remove('dark');
            }
          }
        });
      } catch (e) {
        console.error('Theme initialization failed:', e);
      }
    })();
  `;

  return (
    <html 
      lang="en" 
      suppressHydrationWarning
      className={inter.variable}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body 
        className={[
          'min-h-screen bg-white text-black antialiased transition-colors dark:bg-black dark:text-white',
          inter.className,
        ].join(' ')}
      >
        {/* Skip to main content for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-black focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-white dark:focus:bg-white dark:focus:text-black dark:focus:ring-black"
        >
          Skip to main content
        </a>

        {/* Main content */}
        <div id="main-content">
          <Providers>
            {children}
          </Providers>
        </div>

        {/* Global loading indicator (optional) */}
        <div
          id="global-loading"
          className="pointer-events-none fixed inset-0 z-50 hidden items-center justify-center bg-black/50 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-3">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent" />
            <p className="text-sm font-medium text-white">Loading...</p>
          </div>
        </div>
      </body>
    </html>
  );
}

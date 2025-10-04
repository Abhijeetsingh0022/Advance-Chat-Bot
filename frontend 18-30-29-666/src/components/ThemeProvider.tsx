'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useSettingsStore();

  useEffect(() => {
    // Apply theme immediately on mount
    const isDark = theme === 'dark';
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    console.log('Theme applied:', theme);
  }, [theme]);

  return <>{children}</>;
}

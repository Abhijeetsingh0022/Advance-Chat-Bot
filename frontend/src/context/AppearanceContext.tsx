/**
 * AppearanceContext
 * Loads and manages appearance settings from backend
 * Automatically applies settings on app mount
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';

type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';
type MessageStyle = 'classic' | 'rounded' | 'bubble';

interface AppearanceSettings {
  theme: ThemeMode;
  font_size: FontSize;
  message_style: MessageStyle;
  compact_mode: boolean;
  glass_style: string;
  accent_color: string;
}

interface AppearanceContextType {
  settings: AppearanceSettings;
  updateSettings: (settings: Partial<AppearanceSettings>) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: AppearanceSettings = {
  theme: 'system',
  font_size: 'medium',
  message_style: 'rounded',
  compact_mode: false,
  glass_style: 'default',
  accent_color: 'gray',
};

const AppearanceContext = createContext<AppearanceContextType>({
  settings: defaultSettings,
  updateSettings: async () => {},
  isLoading: true,
});

export const useAppearance = () => useContext(AppearanceContext);

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppearanceSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const { isAuthenticated } = useAuthStore();

  // Load settings from backend on mount or when auth changes
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First, load from localStorage for instant UI
        const cachedTheme = localStorage.getItem('theme-mode') as ThemeMode;
        const cachedFontSize = localStorage.getItem('font-size') as FontSize;
        const cachedMessageStyle = localStorage.getItem('message-style') as MessageStyle;
        const cachedCompact = localStorage.getItem('compact-mode') === 'true';

        const cachedSettings: AppearanceSettings = {
          theme: cachedTheme || 'system',
          font_size: cachedFontSize || 'medium',
          message_style: cachedMessageStyle || 'rounded',
          compact_mode: cachedCompact,
          glass_style: localStorage.getItem('glass-style') || 'default',
          accent_color: localStorage.getItem('accent-color') || 'gray',
        };

        // Apply cached settings immediately
        setSettings(cachedSettings);
        applySettings(cachedSettings);

        // If user is authenticated, sync with backend
        if (isAuthenticated) {
          try {
            const response = await api.settings.getAppearance();
            const backendSettings = response?.data || response;

            if (backendSettings) {
              const mergedSettings: AppearanceSettings = {
                theme: backendSettings.theme || cachedSettings.theme,
                font_size: backendSettings.font_size || cachedSettings.font_size,
                message_style: backendSettings.message_style || cachedSettings.message_style,
                compact_mode: backendSettings.compact_mode ?? cachedSettings.compact_mode,
                glass_style: backendSettings.glass_style || cachedSettings.glass_style,
                accent_color: backendSettings.accent_color || cachedSettings.accent_color,
              };

              // Update state and localStorage
              setSettings(mergedSettings);
              saveToLocalStorage(mergedSettings);
              applySettings(mergedSettings);

              console.log('✅ Loaded appearance settings from backend:', mergedSettings);
            }
          } catch (error: any) {
            // Silently fail for auth errors, use cached settings
            if (error?.response?.status === 401 || error?.response?.status === 403) {
              console.log('Using cached appearance settings (not authenticated)');
            } else {
              console.error('Failed to load appearance settings:', error);
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to load cached appearance settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [isAuthenticated]);

  const updateSettings = async (updates: Partial<AppearanceSettings>) => {
    const newSettings = { ...settings, ...updates };
    
    // Update state immediately for instant UI response
    setSettings(newSettings);
    saveToLocalStorage(newSettings);
    applySettings(newSettings);

    // Sync to backend if authenticated
    if (isAuthenticated) {
      try {
        await api.settings.updateAppearance(newSettings);
        console.log('✅ Saved appearance settings to backend');
      } catch (error) {
        console.error('Failed to save appearance settings to backend:', error);
        // Don't revert - keep local changes
      }
    }
  };

  return (
    <AppearanceContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </AppearanceContext.Provider>
  );
};

// Helper: Apply settings to DOM
function applySettings(settings: AppearanceSettings) {
  const root = document.documentElement;

  // Apply theme
  root.classList.remove('dark', 'light');
  if (settings.theme === 'dark') {
    root.classList.add('dark');
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
  } else {
    // System preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Apply font size
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };
  root.style.fontSize = fontSizeMap[settings.font_size] || '16px';

  // Apply message style
  root.setAttribute('data-message-style', settings.message_style);

  // Apply compact mode
  if (settings.compact_mode) {
    root.classList.add('compact-mode');
  } else {
    root.classList.remove('compact-mode');
  }

  // Apply accent color
  root.setAttribute('data-accent-color', settings.accent_color);
  
  // Apply CSS custom property for accent color
  const accentColorMap: Record<string, string> = {
    gray: '#6b7280',
    blue: '#3b82f6',
    purple: '#a855f7',
    green: '#10b981',
    orange: '#f97316',
    red: '#ef4444',
  };
  const accentHex = accentColorMap[settings.accent_color] || accentColorMap.gray;
  root.style.setProperty('--accent-color', accentHex);

  console.log('✅ Applied appearance settings:', settings);
}

// Helper: Save to localStorage
function saveToLocalStorage(settings: AppearanceSettings) {
  localStorage.setItem('theme-mode', settings.theme);
  localStorage.setItem('font-size', settings.font_size);
  localStorage.setItem('message-style', settings.message_style);
  localStorage.setItem('compact-mode', String(settings.compact_mode));
  localStorage.setItem('glass-style', settings.glass_style);
  localStorage.setItem('accent-color', settings.accent_color);
}

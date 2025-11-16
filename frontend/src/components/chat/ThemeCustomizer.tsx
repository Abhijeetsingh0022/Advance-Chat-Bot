/**
 * ThemeCustomizer Component
 * Minimal black & white theme settings
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAppearance } from '@/context/AppearanceContext';

interface ThemeCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ThemeMode = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';
type MessageStyle = 'classic' | 'rounded' | 'bubble';

export const ThemeCustomizer: React.FC<ThemeCustomizerProps> = ({ isOpen, onClose }) => {
  const { settings: globalSettings, updateSettings, isLoading: isLoadingGlobal } = useAppearance();
  
  // Local state for the modal (synced with global settings)
  const [themeMode, setThemeMode] = useState<ThemeMode>(globalSettings.theme);
  const [fontSize, setFontSize] = useState<FontSize>(globalSettings.font_size);
  const [messageStyle, setMessageStyle] = useState<MessageStyle>(globalSettings.message_style);
  const [compactMode, setCompactMode] = useState(globalSettings.compact_mode);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync local state with global settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setThemeMode(globalSettings.theme);
      setFontSize(globalSettings.font_size);
      setMessageStyle(globalSettings.message_style);
      setCompactMode(globalSettings.compact_mode);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, globalSettings]);

  // Save settings to global context (which syncs to backend)
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      await updateSettings({
        theme: themeMode,
        font_size: fontSize,
        message_style: messageStyle,
        compact_mode: compactMode,
      });
      
      toast.success('Appearance settings saved');
      setHasUnsavedChanges(false);
    } catch (error: any) {
      console.error('Failed to save appearance settings:', error);
      toast.error('Failed to save settings. Changes saved locally only.');
    } finally {
      setIsSaving(false);
    }
  };

  // Track unsaved changes
  useEffect(() => {
    if (isOpen && !isLoadingGlobal) {
      const hasChanges = 
        themeMode !== globalSettings.theme ||
        fontSize !== globalSettings.font_size ||
        messageStyle !== globalSettings.message_style ||
        compactMode !== globalSettings.compact_mode;
      setHasUnsavedChanges(hasChanges);
    }
  }, [themeMode, fontSize, messageStyle, compactMode, isOpen, isLoadingGlobal, globalSettings]);

  // Preview changes in real-time by temporarily applying them
  // (These will be reverted if user closes without saving)
  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    
    // Apply theme preview
    const applyTheme = () => {
      root.classList.remove('dark', 'light');
      if (themeMode === 'dark') {
        root.classList.add('dark');
      } else if (themeMode === 'light') {
        root.classList.remove('dark');
      } else {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyTheme();

    // Apply font size preview
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
    root.style.fontSize = fontSizeMap[fontSize];

    // Apply message style preview
    root.setAttribute('data-message-style', messageStyle);

    // Apply compact mode preview
    if (compactMode) {
      root.classList.add('compact-mode');
    } else {
      root.classList.remove('compact-mode');
    }

    // Listen for system theme changes when in system mode
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [themeMode, fontSize, messageStyle, compactMode, isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 animate-fade-in bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl animate-fade-in-up overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-black">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-black">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-black p-2 dark:bg-white">
                <SunIcon className="h-5 w-5 text-white dark:text-black" />
              </div>
              <h2 className="text-xl font-bold text-black dark:text-white">Appearance</h2>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-8 p-6">
            {isLoadingGlobal ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent dark:border-white" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">Loading settings...</p>
                </div>
              </div>
            ) : (
              <>
            {/* Theme Mode */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
                Theme
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'light', label: 'Light', icon: SunIcon },
                  { id: 'dark', label: 'Dark', icon: MoonIcon },
                  { id: 'system', label: 'System', icon: ComputerDesktopIcon },
                ].map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setThemeMode(id as ThemeMode)}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      themeMode === id
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon
                      className={`mx-auto mb-2 h-8 w-8 ${
                        themeMode === id ? '' : 'opacity-60'
                      }`}
                    />
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
                Font Size
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'small', label: 'Small', size: 'text-sm' },
                  { id: 'medium', label: 'Medium', size: 'text-base' },
                  { id: 'large', label: 'Large', size: 'text-lg' },
                ].map(({ id, label, size }) => (
                  <button
                    key={id}
                    onClick={() => setFontSize(id as FontSize)}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      fontSize === id
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className={`mb-1 font-bold ${size}`}>Aa</div>
                    <div className="text-xs">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Style */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
                Message Style
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'classic', label: 'Classic' },
                  { id: 'rounded', label: 'Rounded' },
                  { id: 'bubble', label: 'Bubble' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setMessageStyle(id as MessageStyle)}
                    className={`rounded-xl border-2 p-4 transition-all ${
                      messageStyle === id
                        ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="mb-2 flex h-12 items-center justify-center">
                      <div
                        className={`h-8 w-full ${
                          id === 'classic'
                            ? 'rounded border-2 border-gray-400'
                            : id === 'rounded'
                            ? 'rounded-lg border-2 border-gray-400'
                            : 'rounded-full border-2 border-gray-400'
                        }`}
                      />
                    </div>
                    <div className="text-sm font-medium">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Mode Toggle */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
                Display
              </label>
              <button
                onClick={() => setCompactMode(!compactMode)}
                className={`flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all ${
                  compactMode
                    ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div>
                  <div className="text-left text-sm font-semibold">Compact Mode</div>
                  <div className="text-left text-xs opacity-70">
                    Reduce spacing for more messages
                  </div>
                </div>
                {compactMode && <CheckIcon className="h-5 w-5" />}
              </button>
            </div>

            {/* Preview Section */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <div className="mb-3 text-xs font-semibold text-gray-600 dark:text-gray-400">
                PREVIEW
              </div>
              <div className="space-y-3">
                {/* AI Message */}
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-black dark:bg-white" />
                  <div className="flex-1 rounded-xl border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-black">
                    <p className="text-black dark:text-white">
                      This is how messages will appear with your settings.
                    </p>
                  </div>
                </div>
                {/* User Message */}
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 flex-shrink-0 rounded-lg bg-gray-800 dark:bg-gray-200" />
                  <div className="flex-1 rounded-xl border border-gray-800 bg-black p-3 text-sm dark:border-gray-200 dark:bg-white">
                    <p className="text-white dark:text-black">Your messages look like this.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setThemeMode('system');
                  setFontSize('medium');
                  setMessageStyle('rounded');
                  setCompactMode(false);
                }}
                className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900"
              >
                Reset
              </button>
              <button
                onClick={saveSettings}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
              >
                {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Settings' : 'Saved ✓'}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

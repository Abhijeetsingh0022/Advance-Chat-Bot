/**
 * useKeyboardShortcuts Hook
 * Manages keyboard shortcuts for the chat application
 */

import { useEffect } from 'react';
import { KeyboardShortcut } from '@/types/chat';

interface UseKeyboardShortcutsProps {
  onSendMessage?: () => void;
  onNewChat?: () => void;
  onToggleAISettings?: () => void;
  onToggleAIConfig?: () => void;
  onClearFiles?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onSendMessage,
  onNewChat,
  onToggleAISettings,
  onToggleAIConfig,
  onClearFiles,
  enabled = true,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Enter: Send message
      if (modKey && e.key === 'Enter' && onSendMessage) {
        e.preventDefault();
        onSendMessage();
      }

      // Cmd/Ctrl + K: New chat
      if (modKey && e.key === 'k' && onNewChat) {
        e.preventDefault();
        onNewChat();
      }

      // Cmd/Ctrl + /: Toggle AI settings
      if (modKey && e.key === '/' && (onToggleAISettings || onToggleAIConfig)) {
        e.preventDefault();
        if (onToggleAIConfig) onToggleAIConfig();
        else if (onToggleAISettings) onToggleAISettings();
      }

      // Escape: Clear files
      if (e.key === 'Escape' && onClearFiles) {
        e.preventDefault();
        onClearFiles();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onSendMessage, onNewChat, onToggleAISettings, onToggleAIConfig, onClearFiles]);
}

// Hook to get available shortcuts
export function useShortcutsList(): KeyboardShortcut[] {
  const isMac = typeof window !== 'undefined' && 
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKeyLabel = isMac ? 'Cmd' : 'Ctrl';

  return [
    {
      key: 'Enter',
      modKey: true,
      action: () => {},
      description: `${modKeyLabel}+Enter to send message`,
    },
    {
      key: 'k',
      modKey: true,
      action: () => {},
      description: `${modKeyLabel}+K for new chat`,
    },
    {
      key: '/',
      modKey: true,
      action: () => {},
      description: `${modKeyLabel}+/ to toggle AI settings`,
    },
    {
      key: 'Escape',
      modKey: false,
      action: () => {},
      description: 'Esc to clear files',
    },
  ];
}

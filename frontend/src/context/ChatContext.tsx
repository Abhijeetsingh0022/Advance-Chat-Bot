/**
 * ChatContext
 * Provides chat state and operations throughout the app
 */

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useChat } from '@/hooks/useChat';
import { UseChatReturn } from '@/types/chat';

const ChatContext = createContext<UseChatReturn | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const chat = useChat();

  return <ChatContext.Provider value={chat}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

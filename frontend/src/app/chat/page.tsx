/**
 * ChatPage - Modern AI Chat Interface
 * Fully optimized with proper scroll handling, black & white theme
 * 
 * @version 5.0.0
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

// Context Providers
import { ChatProvider, useChatContext } from '@/context/ChatContext';
import { useAIConfig } from '@/context/AIConfigContext';

// Custom Hooks
import { useStreaming } from '@/hooks/useStreaming';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSessions } from '@/hooks/useSessions';
import { useMemories } from '@/hooks/useMemories';

// Components
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { AIConfigPanel } from '@/components/chat/AIConfigPanel';
import { ThemeCustomizer } from '@/components/chat/ThemeCustomizer';
import { CollapsibleSidebar } from '@/components/chat/CollapsibleSidebar';
import MemoryDashboard from '@/components/MemoryDashboard';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const AUTH_CHECK_DELAY = 50;
const SCROLL_THRESHOLD = 100;

// ==================== LOADING COMPONENT ====================

const LoadingScreen = ({ message = 'Loading...' }) => (
  <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
    <div className="space-y-4 text-center">
      <div className="relative mx-auto h-16 w-16">
        <div className="absolute inset-0 animate-pulse rounded-full border-4 border-gray-200 dark:border-gray-800" />
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-black dark:border-t-white" />
      </div>
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{message}</p>
    </div>
  </div>
);

// ==================== MAIN CHAT COMPONENT ====================

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Refs
  const sessionLoadedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const previousMessageCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  // Auth & Context
  const { token, logout } = useAuthStore();
  const {
    messages,
    currentSessionId,
    loading,
    loadingMessages,
    error,
    loadMessages,
    sendMessage,
    deleteMessage,
    regenerateResponse,
    createNewSession,
    deleteSession,
  } = useChatContext();

  const { config } = useAIConfig();

  // Streaming
  const {
    isStreaming,
    streamingMessage,
    isToolCallActive,
    streamMessage,
    resetStreaming,
  } = useStreaming();

  // Sessions & Memories
  const {
    sessions,
    fetchSessions,
    deleteSession: deleteSessionFromList,
    pinSession,
    archiveSession,
    renameSession,
  } = useSessions();

  const {
    memories,
    addMemory,
    deleteMemory,
    clearAllMemories,
  } = useMemories();

  // Local State
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false);
  const [showMemoryDashboard, setShowMemoryDashboard] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ==================== COMPUTED VALUES ====================

  const isInputDisabled = useMemo(() => {
    return loading || isStreaming || loadingMessages;
  }, [loading, isStreaming, loadingMessages]);

  const canSubmit = useMemo(() => {
    return (inputMessage.trim() || selectedFiles.length > 0) && !isInputDisabled;
  }, [inputMessage, selectedFiles, isInputDisabled]);

  // ==================== SCROLL UTILITIES ====================

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!shouldAutoScrollRef.current) return;
    
    // Use setTimeout to ensure DOM has updated
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior,
          block: 'nearest'
        });
      }
    }, 0);
  }, []);

  const isNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < SCROLL_THRESHOLD;
  }, []);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    shouldAutoScrollRef.current = isNearBottom();
  }, [isNearBottom]);

  // ==================== SESSION MANAGEMENT ====================

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      resetStreaming();
    }
    
    createNewSession();
    setInputMessage('');
    setSelectedFiles([]);
    sessionLoadedRef.current = false;
    isInitialLoadRef.current = true;
    shouldAutoScrollRef.current = true;
    previousMessageCountRef.current = 0;
    
    fetchSessions().catch(err => {
      console.error('Failed to refresh sessions:', err);
    });
    
    toast.success('New chat started');
  }, [createNewSession, fetchSessions, isStreaming, resetStreaming]);

  const handleSessionSelect = useCallback((sessionId: string) => {
    if (sessionId === currentSessionId) return;

    if (isStreaming) {
      toast.error('Wait for current response to complete');
      return;
    }

    shouldAutoScrollRef.current = true;
    isInitialLoadRef.current = true;
    previousMessageCountRef.current = 0;

    loadMessages(sessionId);
    router.push(`/chat?session=${sessionId}`, { scroll: false });
    sessionLoadedRef.current = true;
  }, [currentSessionId, loadMessages, router, isStreaming]);

  const handleSessionDelete = useCallback(async (sessionId: string) => {
    if (!confirm('Delete this chat? This action cannot be undone.')) return;

    try {
      await deleteSessionFromList(sessionId);
      await deleteSession(sessionId);
      
      if (sessionId === currentSessionId) {
        createNewSession();
      }
      
      await fetchSessions();
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete chat');
    }
  }, [currentSessionId, deleteSession, deleteSessionFromList, fetchSessions, createNewSession]);

  // ==================== MESSAGE HANDLING ====================

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const userMessage = inputMessage.trim();
    const files = [...selectedFiles];
    
    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File ${file.name} is too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
      }
    }
    
    setInputMessage('');
    setSelectedFiles([]);
    shouldAutoScrollRef.current = true;

    try {
      if (config.useStreaming && files.length === 0) {
        await streamMessage(
          userMessage,
          currentSessionId || null,
          {
            onChunk: () => {
              scrollToBottom('auto');
            },
            onComplete: async (data) => {
              if (data.session_id && !currentSessionId) {
                router.push(`/chat?session=${data.session_id}`, { scroll: false });
              }
              
              // Reload messages to show the complete conversation
              const sessionId = data.session_id || currentSessionId;
              if (sessionId) {
                await loadMessages(sessionId);
              }
              
              await fetchSessions();
              
              if (data.memories && data.memories.length > 0) {
                data.memories.forEach((memory: any) => addMemory(memory));
                toast.success(`${data.memories.length} memories saved`);
              }
              
              scrollToBottom();
            },
            onError: (error) => {
              const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
              toast.error(errorMessage);
              setInputMessage(userMessage);
              setSelectedFiles(files);
            },
            onRouting: (routing) => {
              toast.success(`Using ${routing.model}`, { duration: 2000 });
            },
            onToolCall: (toolCall) => {
              const toolName = toolCall.function?.name || 'tool';
              toast.success(`Using ${toolName}`, { duration: 2000 });
            },
          },
          {
            model: config.model,
            temperature: config.temperature,
            conversationType: 'general',
            optimizeFor: config.optimize_for,
            maxTokens: config.max_tokens,
          }
        );
      } else {
        const formData = new FormData();
        formData.append('message', userMessage);
        
        if (currentSessionId) {
          formData.append('session_id', currentSessionId);
        }
        
        files.forEach(file => formData.append('files', file));
        formData.append('model', config.model);
        formData.append('temperature', config.temperature?.toString() || '0.7');
        if (config.max_tokens !== undefined) {
          formData.append('max_tokens', config.max_tokens.toString());
        }

        const response = await fetch(`${API_BASE_URL}/chat/with-files`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to send message');
        }

        const data = await response.json();
        
        if (data.session_id && !currentSessionId) {
          router.push(`/chat?session=${data.session_id}`, { scroll: false });
        }
        
        // Reload messages to show the complete conversation
        const sessionId = data.session_id || currentSessionId;
        if (sessionId) {
          await loadMessages(sessionId);
        }
        
        await fetchSessions();
        toast.success('Message sent');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
      toast.error(errorMessage);
      setInputMessage(userMessage);
      setSelectedFiles(files);
    }
  }, [
    canSubmit,
    inputMessage,
    selectedFiles,
    config,
    currentSessionId,
    streamMessage,
    router,
    fetchSessions,
    addMemory,
    token,
    scrollToBottom,
  ]);

  // ==================== MESSAGE ACTIONS ====================

  const handleMessageCopy = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      navigator.clipboard.writeText(message.content);
      toast.success('Copied to clipboard');
    }
  }, [messages]);

  const handleMessageSpeak = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    
    if (!message) return;
    
    if (!('speechSynthesis' in window)) {
      toast.error('Text-to-speech not supported');
      return;
    }

    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
    toast.success('Reading message...');
  }, [messages]);

  const handleMessageRegenerate = useCallback(async (messageId: string) => {
    try {
      shouldAutoScrollRef.current = true;
      await regenerateResponse(messageId);
      toast.success('Response regenerated');
    } catch (error) {
      console.error('Failed to regenerate:', error);
      toast.error('Failed to regenerate response');
    }
  }, [regenerateResponse]);

  const handleMessageRegenerateWithModel = useCallback(async (messageId: string, modelId: string) => {
    try {
      shouldAutoScrollRef.current = true;
      
      // Find the message to get the user's previous message
      const messageIndex = messages.findIndex((m) => m.id === messageId);
      if (messageIndex === -1 || messageIndex === 0) return;

      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== 'user') return;

      // Delete the old AI response
      await deleteMessage(messageId);

      // Temporarily switch model, send message, then restore
      const previousModel = config.model;
      config.model = modelId;

      // Send with new model
      if (config.useStreaming) {
        await streamMessage(
          userMessage.content,
          currentSessionId || null,
          {
            onComplete: async () => {
              if (currentSessionId) {
                await loadMessages(currentSessionId);
              }
              config.model = previousModel; // Restore original model
              toast.success(`Response regenerated with ${modelId}`);
            },
            onError: () => {
              config.model = previousModel; // Restore on error too
            },
          },
          {
            model: modelId,
            temperature: config.temperature,
            conversationType: 'general',
            optimizeFor: config.optimize_for,
            maxTokens: config.max_tokens,
          }
        );
      } else {
        await sendMessage({
          message: userMessage.content,
          session_id: currentSessionId,
        });
        config.model = previousModel;
        toast.success(`Response regenerated with ${modelId}`);
      }
    } catch (error) {
      console.error('Failed to regenerate with model:', error);
      toast.error('Failed to regenerate response');
    }
  }, [messages, currentSessionId, config, deleteMessage, streamMessage, sendMessage, loadMessages]);

  const handleMessageDelete = useCallback(async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    
    try {
      await deleteMessage(messageId);
      toast.success('Message deleted');
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete message');
    }
  }, [deleteMessage]);

  const handleMessageFavorite = useCallback((messageId: string) => {
    toast.success('Favorite toggled');
  }, []);

  // ==================== EXPORT HANDLERS ====================

  const handleCopyConversation = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to copy');
      return;
    }
    
    const text = messages
      .map(m => `${m.role === 'user' ? 'You' : 'AI'}:\n${m.content}`)
      .join('\n\n---\n\n');
    
    navigator.clipboard.writeText(text);
    toast.success('Conversation copied');
  }, [messages]);

  const handleExportMarkdown = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    let markdown = `# Chat Conversation\n\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**Model:** ${config.model}\n\n---\n\n`;
    
    messages.forEach((m, i) => {
      const role = m.role === 'user' ? 'You' : 'AI Assistant';
      markdown += `## ${role}\n\n${m.content}\n\n`;
      if (i < messages.length - 1) markdown += `---\n\n`;
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Exported as Markdown');
  }, [messages, config.model]);

  const handleExportText = useCallback(() => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }
    
    let text = `CHAT CONVERSATION\n${'='.repeat(80)}\n\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += `Model: ${config.model}\n\n${'='.repeat(80)}\n\n`;
    
    messages.forEach((m, i) => {
      const role = m.role === 'user' ? 'YOU' : 'AI ASSISTANT';
      text += `[${i + 1}] ${role}\n${'-'.repeat(80)}\n${m.content}\n\n`;
    });
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Exported as text file');
  }, [messages, config.model]);

  const handleShareConversation = useCallback(() => {
    if (!currentSessionId) {
      toast.error('No conversation to share');
      return;
    }
    
    const shareUrl = `${window.location.origin}/chat?session=${currentSessionId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied');
  }, [currentSessionId]);

  const handleDeleteCurrentSession = useCallback(async () => {
    if (!currentSessionId) {
      toast.error('No conversation to delete');
      return;
    }
    
    if (!confirm('Delete this conversation? This action cannot be undone.')) return;
    
    try {
      await deleteSession(currentSessionId);
      toast.success('Conversation deleted');
      createNewSession();
      await fetchSessions();
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error('Failed to delete conversation');
    }
  }, [currentSessionId, deleteSession, createNewSession, fetchSessions]);

  // ==================== FILE HANDLING ====================

  const handleFileAdd = useCallback((newFiles: File[]) => {
    setSelectedFiles((prev) => {
      const combined = [...prev, ...newFiles];
      if (combined.length > MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        return combined.slice(0, MAX_FILES);
      }
      return combined;
    });
  }, []);

  const handleFileRemove = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // ==================== KEYBOARD SHORTCUTS ====================

  useKeyboardShortcuts({
    onSendMessage: handleSubmit,
    onNewChat: handleNewChat,
    onToggleAIConfig: () => setShowAIConfig(prev => !prev),
    onClearFiles: () => setSelectedFiles([]),
  });

  // ==================== EFFECTS ====================

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      await new Promise(resolve => setTimeout(resolve, AUTH_CHECK_DELAY));
      
      if (!token) {
        router.replace('/login');
        return;
      }
      
      try {
        await fetchSessions();
      } catch (error) {
        console.error('Failed to fetch initial data:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [token, router, fetchSessions]);

  // Handle URL session parameter
  useEffect(() => {
    if (isCheckingAuth || sessionLoadedRef.current) return;

    const sessionId = searchParams?.get('session');
    
    if (sessionId && sessionId !== currentSessionId) {
      loadMessages(sessionId);
      sessionLoadedRef.current = true;
    } else if (!sessionId && !currentSessionId) {
      createNewSession();
    }
  }, [searchParams, currentSessionId, loadMessages, createNewSession, isCheckingAuth]);

  // Listen for custom events
  useEffect(() => {
    const handleNewChatEvent = () => handleNewChat();
    const handleSessionsUpdate = () => fetchSessions();
    
    window.addEventListener('new-chat', handleNewChatEvent);
    window.addEventListener('sessions-updated', handleSessionsUpdate);
    
    return () => {
      window.removeEventListener('new-chat', handleNewChatEvent);
      window.removeEventListener('sessions-updated', handleSessionsUpdate);
    };
  }, [handleNewChat, fetchSessions]);

  // Loading time tracker
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (loading || isStreaming) {
      setLoadingTime(0);
      timer = setInterval(() => setLoadingTime(prev => prev + 1), 1000);
    } else {
      setLoadingTime(0);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [loading, isStreaming]);

  // Error handling
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Smart auto-scroll
  useEffect(() => {
    const currentMessageCount = messages.length;
    const hadMessages = previousMessageCountRef.current > 0;
    const newMessagesAdded = currentMessageCount > previousMessageCountRef.current;
    
    previousMessageCountRef.current = currentMessageCount;
    
    let shouldScroll = false;
    let scrollBehavior: ScrollBehavior = 'smooth';
    
    if (isInitialLoadRef.current && currentMessageCount > 0 && !loadingMessages) {
      shouldScroll = true;
      scrollBehavior = 'auto';
      isInitialLoadRef.current = false;
    } else if (isStreaming) {
      shouldScroll = shouldAutoScrollRef.current;
      scrollBehavior = 'auto';
    } else if (newMessagesAdded && hadMessages && !loadingMessages) {
      shouldScroll = shouldAutoScrollRef.current;
      scrollBehavior = 'smooth';
    }
    
    if (shouldScroll) {
      scrollToBottom(scrollBehavior);
    }
  }, [messages, streamingMessage, isStreaming, loadingMessages, scrollToBottom]);

  // ==================== RENDER ====================

  if (isCheckingAuth) {
    return <LoadingScreen message="Authenticating..." />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-black">
      {/* Sidebar */}
      <CollapsibleSidebar
        currentSessionId={currentSessionId || undefined}
        onSessionSelect={handleSessionSelect}
        onNewSession={handleNewChat}
        onDeleteSession={handleDeleteCurrentSession}
        onToggleSidebar={setIsSidebarOpen}
      />

      {/* Main Chat Container */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-gray-200 bg-white dark:border-gray-900 dark:bg-black">
          <ChatHeader
            isTyping={isStreaming}
            messages={messages}
            currentSessionId={currentSessionId}
            onCopyConversation={handleCopyConversation}
            onExportMarkdown={handleExportMarkdown}
            onExportText={handleExportText}
            onShareConversation={handleShareConversation}
            onDeleteSession={handleDeleteCurrentSession}
            onToggleThemeCustomizer={() => setShowThemeCustomizer(prev => !prev)}
            onToggleMemoryDashboard={() => setShowMemoryDashboard(prev => !prev)}
            onBranchChange={() => currentSessionId && loadMessages(currentSessionId)}
            onLogout={() => {
              logout();
              router.push('/login');
            }}
          />
        </header>

        {/* Messages Container */}
        <section 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
        >
          <div className="h-full w-full">
            <MessageList
              messages={messages}
              loading={loadingMessages}
              isTyping={isStreaming}
              streamingMessage={streamingMessage}
              aiModelName={config.model}
              loadingTime={loadingTime}
              isToolCallActive={isToolCallActive}
              sessionId={currentSessionId}
              onQuickAction={setInputMessage}
              onMessageCopy={handleMessageCopy}
              onMessageSpeak={handleMessageSpeak}
              onMessageRegenerate={handleMessageRegenerate}
              onMessageRegenerateWithModel={handleMessageRegenerateWithModel}
              onMessageDelete={handleMessageDelete}
              onMessageFavorite={handleMessageFavorite}
              onBranchCreated={() => currentSessionId && loadMessages(currentSessionId)}
            />
            
            <div 
              ref={messagesEndRef} 
              className="h-4 w-full flex-shrink-0" 
              aria-hidden="true"
            />
          </div>
        </section>

        {/* Input */}
        <footer className="flex-shrink-0 border-t border-gray-200 bg-white dark:border-gray-900 dark:bg-black">
          <ChatInput
            value={inputMessage}
            loading={loading}
            files={selectedFiles}
            onChange={setInputMessage}
            onSubmit={handleSubmit}
            onFileAdd={handleFileAdd}
            onFileRemove={handleFileRemove}
            onAISettingsToggle={() => setShowAIConfig(prev => !prev)}
            disabled={isInputDisabled}
            placeholder={
              isStreaming 
                ? 'AI is responding...' 
                : selectedFiles.length > 0 
                  ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} attached`
                  : 'Type your message...'
            }
          />
        </footer>
      </main>

      {/* Side Panels */}
      <aside>
        <AIConfigPanel 
          isOpen={showAIConfig} 
          onClose={() => setShowAIConfig(false)} 
        />
        
        <ThemeCustomizer 
          isOpen={showThemeCustomizer} 
          onClose={() => setShowThemeCustomizer(false)} 
        />
        
        {/* Memory Dashboard Modal */}
        {showMemoryDashboard && (
          <MemoryDashboard
            isOpen={showMemoryDashboard}
            onClose={() => setShowMemoryDashboard(false)}
          />
        )}
      </aside>
    </div>
  );
}

// ==================== EXPORTED COMPONENT ====================

export default function ChatPage() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <Suspense fallback={<LoadingScreen />}>
          <ChatPageContent />
        </Suspense>
      </ChatProvider>
    </ErrorBoundary>
  );
}

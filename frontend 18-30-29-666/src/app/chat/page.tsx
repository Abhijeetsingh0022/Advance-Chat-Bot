'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store';
import { chatAPI } from '@/lib/api';
import { Message } from '@/types';
import toast from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  SparklesIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
  PencilIcon,
  HeartIcon,
  EllipsisVerticalIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  TrashIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useSettingsStore } from '@/store';
import { formatDistanceToNow } from 'date-fns';
// New feature components
import MessageReactions from '@/components/MessageReactions';
import VoiceControls, { speakText, stopSpeaking } from '@/components/VoiceControls';
import CodeBlock from '@/components/CodeBlock';
import { BranchControls, BranchSelector } from '@/components/BranchControls';
import ToolsPanel from '@/components/ToolsPanel';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, setToken } = useAuthStore();
  const { theme, glassStyle, fontSize, accentColor, setGlassStyle, setFontSize, setAccentColor, toggleTheme } = useSettingsStore();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hoveredMessage, setHoveredMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false); // AI config closed by default
  const [showThemeCustomizer, setShowThemeCustomizer] = useState(false); // Theme customization modal
  const [aiModel, setAiModel] = useState('openai/gpt-oss-20b:free');
  const [temperature, setTemperature] = useState(0.7);
  const [loadingTime, setLoadingTime] = useState(0); // Track elapsed time
  // New feature states
  const [useStreaming, setUseStreaming] = useState(true); // Enable streaming by default
  const [streamingMessage, setStreamingMessage] = useState(''); // Accumulate streaming chunks
  const [isTTSEnabled, setIsTTSEnabled] = useState(false); // Text-to-speech toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const loadingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Real AI models from backend ai_provider.py
  const aiModels = [
    { id: 'openai/gpt-oss-20b:free', name: 'GPT-OSS 20B', type: 'general', provider: 'OpenRouter' },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', type: 'general', provider: 'Groq' },
    { id: 'deepseek/deepseek-chat-v3.1:free', name: 'DeepSeek V3.1', type: 'reasoning', provider: 'DeepSeek' },
    { id: 'qwen/qwen3-coder:free', name: 'Qwen3 Coder', type: 'coding', provider: 'OpenRouter' },
    { id: 'x-ai/grok-4-fast:free', name: 'Grok 4 Fast', type: 'coding', provider: 'xAI' },
    { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', type: 'image', provider: 'OpenRouter' },
    { id: 'qwen/qwen2.5-vl-72b-instruct:free', name: 'Qwen2.5-VL 72B', type: 'image', provider: 'Qwen' },
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', type: 'text', provider: 'Google' },
  ];

  // Listen for session changes from URL (FIXED: Use useSearchParams)
  useEffect(() => {
    const sessionId = searchParams?.get('session');
    console.log('URL session parameter changed:', sessionId);
    if (sessionId && sessionId !== currentSessionId) {
      console.log('Loading session from URL:', sessionId);
      setCurrentSessionId(sessionId);
    } else if (!sessionId && currentSessionId) {
      // URL cleared, reset to new chat
      console.log('URL cleared, resetting session');
      setCurrentSessionId(null);
      setMessages([]);
    }
  }, [searchParams]);

  // Listen for new chat event from sidebar
  useEffect(() => {
    const handleNewChat = () => {
      createNewSession();
    };
    window.addEventListener('new-chat', handleNewChat as EventListener);
    return () => window.removeEventListener('new-chat', handleNewChat as EventListener);
  }, []);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Wait for zustand to hydrate from localStorage
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const currentToken = useAuthStore.getState().token;
      const currentUser = useAuthStore.getState().user;
      
      console.log('Auth check:', { 
        hasToken: !!currentToken, 
        hasUser: !!currentUser,
        email: currentUser?.email 
      });
      
      if (!currentToken) {
        console.log('No token found, redirecting to login');
        router.replace('/login');
        return;
      }
      
      setIsCheckingAuth(false);
    };
    
    checkAuth();
  }, []); // Run only once on mount

  // Load sessions on mount (only after auth check passes)
  useEffect(() => {
    if (!isCheckingAuth) {
      console.log('Chat page ready');
    }
  }, [isCheckingAuth]);

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    }
  }, [currentSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Track loading time
  useEffect(() => {
    if (loading || isTyping) {
      setLoadingTime(0);
      loadingTimerRef.current = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
        loadingTimerRef.current = null;
      }
      setLoadingTime(0);
    }
    return () => {
      if (loadingTimerRef.current) {
        clearInterval(loadingTimerRef.current);
      }
    };
  }, [loading, isTyping]);

  // Apply theme customizations to document
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Apply font size
    root.style.setProperty('--chat-font-size', 
      fontSize === 'small' ? '0.875rem' : 
      fontSize === 'large' ? '1.125rem' : '1rem'
    );
    
    // Apply glass style opacity
    root.style.setProperty('--glass-opacity',
      glassStyle === 'strong' ? '0.95' :
      glassStyle === 'subtle' ? '0.6' :
      glassStyle === 'vibrant' ? '0.85' : '0.8'
    );
    
    // Apply glass blur
    root.style.setProperty('--glass-blur',
      glassStyle === 'strong' ? '20px' :
      glassStyle === 'subtle' ? '8px' :
      glassStyle === 'vibrant' ? '16px' : '12px'
    );
    
    // Apply accent color
    const accentColors = {
      gray: { main: '107, 114, 128', light: '156, 163, 175', dark: '55, 65, 81' },
      blue: { main: '59, 130, 246', light: '96, 165, 250', dark: '37, 99, 235' },
      purple: { main: '168, 85, 247', light: '192, 132, 252', dark: '147, 51, 234' },
      green: { main: '34, 197, 94', light: '74, 222, 128', dark: '22, 163, 74' },
      red: { main: '239, 68, 68', light: '248, 113, 113', dark: '220, 38, 38' },
    };
    
    const colors = accentColors[accentColor];
    root.style.setProperty('--accent-main', colors.main);
    root.style.setProperty('--accent-light', colors.light);
    root.style.setProperty('--accent-dark', colors.dark);
    
  }, [fontSize, glassStyle, accentColor]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputMessage(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast.error('Speech recognition failed');
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + Enter: Send message
      if (modKey && e.key === 'Enter' && !loading) {
        e.preventDefault();
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        }
      }

      // Cmd/Ctrl + K: New chat
      if (modKey && e.key === 'k') {
        e.preventDefault();
        createNewSession();
        toast.success('Started new chat');
      }

      // Cmd/Ctrl + /: Toggle AI settings
      if (modKey && e.key === '/') {
        e.preventDefault();
        setShowAIConfig(!showAIConfig);
      }

      // Escape: Clear file selection
      if (e.key === 'Escape' && selectedFiles.length > 0) {
        e.preventDefault();
        setSelectedFiles([]);
        toast.success('Files cleared');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, showAIConfig, selectedFiles]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const createNewSession = () => {
    setCurrentSessionId(null);
    setMessages([]);
    setInputMessage('');
    setSelectedFiles([]);
    // Clear URL params
    window.history.pushState({}, '', '/chat');
  };

  const loadMessages = async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const { data } = await chatAPI.getHistory(sessionId, 100);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!inputMessage.trim() && selectedFiles.length === 0) {
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setLoading(true);
    setIsTyping(true);
    setStreamingMessage(''); // Reset streaming message

    try {
      let response;

      if (selectedFiles.length > 0) {
        // Send with files (no streaming support for file uploads)
        const formData = new FormData();
        formData.append('message', userMessage);
        if (currentSessionId) {
          formData.append('session_id', currentSessionId);
        }
        formData.append('conversation_type', 'general');
        formData.append('model', aiModel);
        
        selectedFiles.forEach((file) => {
          formData.append('files', file);
        });

        response = await chatAPI.sendMessageWithFiles(formData);
        setSelectedFiles([]);
        
        const { data } = response;

        // Update current session ID
        if (!currentSessionId) {
          setCurrentSessionId(data.session_id);
          router.push(`/chat?session=${data.session_id}`, { scroll: false });
        }

        // Reload messages
        await loadMessages(data.session_id);
        
      } else if (useStreaming) {
        // Use streaming for text-only messages
        let tempSessionId = currentSessionId;
        let accumulatedMessage = '';

        await chatAPI.streamMessage(
          {
            message: userMessage,
            session_id: currentSessionId || undefined,
            conversation_type: 'general',
            model: aiModel,
            temperature,
          },
          // onChunk
          (chunk: string, accumulated: string) => {
            accumulatedMessage = accumulated;
            setStreamingMessage(accumulated);
            scrollToBottom();
          },
          // onComplete
          async (data: any) => {
            // Update session if new
            if (!tempSessionId && data.session_id) {
              tempSessionId = data.session_id;
              setCurrentSessionId(data.session_id);
              router.push(`/chat?session=${data.session_id}`, { scroll: false });
            }

            // Reload messages to get complete data
            if (tempSessionId) {
              await loadMessages(tempSessionId);
            }

            // Speak the response if TTS is enabled
            if (isTTSEnabled && accumulatedMessage) {
              speakText(accumulatedMessage);
            }

            setStreamingMessage('');
          },
          // onError
          (error: string) => {
            toast.error(error || 'Streaming failed');
            setStreamingMessage('');
          }
        );
      } else {
        // Traditional non-streaming request
        response = await chatAPI.sendMessage({
          message: userMessage,
          session_id: currentSessionId || undefined,
          conversation_type: 'general',
          model: aiModel,
          temperature,
        });

        const { data } = response;

        // Update current session ID
        if (!currentSessionId) {
          setCurrentSessionId(data.session_id);
          router.push(`/chat?session=${data.session_id}`, { scroll: false });
        }

        // Reload messages
        await loadMessages(data.session_id);

        // Speak the response if TTS is enabled
        if (isTTSEnabled && data.reply) {
          speakText(data.reply);
        }
      }
      
      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent('sessions-updated'));
    } catch (error: any) {
      console.error('Error sending message:', error);
      const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to send message';
      toast.error(message);
      setStreamingMessage('');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      await chatAPI.deleteSession(sessionId);
      toast.success('Conversation deleted');
      
      if (currentSessionId === sessionId) {
        createNewSession();
      }
      
      // Trigger sidebar refresh
      window.dispatchEvent(new CustomEvent('sessions-updated'));
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete conversation');
    }
  };

  // Voice input callback
  const handleVoiceTranscript = (transcript: string) => {
    setInputMessage(prevMessage => prevMessage + (prevMessage ? ' ' : '') + transcript);
    toast.success('Voice input captured');
  };

  // Toggle text-to-speech
  const handleToggleTTS = () => {
    setIsTTSEnabled(!isTTSEnabled);
    if (!isTTSEnabled) {
      toast.success('Text-to-speech enabled');
    } else {
      stopSpeaking();
      toast.success('Text-to-speech disabled');
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast.success('Copied to clipboard!');
      },
      (err) => {
        console.error('Failed to copy:', err);
        toast.error('Failed to copy');
      }
    );
  };

  // Regenerate AI response
  const regenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;
    
    // Get the previous user message
    const userMessage = messages[messageIndex - 1];
    if (userMessage.role !== 'user') return;

    try {
      setLoading(true);
      setIsTyping(true);
      
      // Remove the old AI response
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // Resend the user's message
      const response = await chatAPI.sendMessage({
        message: userMessage.content,
        session_id: currentSessionId || undefined,
        conversation_type: 'general',
        model: aiModel,
      });

      const data = response.data;
      
      // Update messages with new response
      if (currentSessionId) {
        await loadMessages(currentSessionId);
      }
      
      toast.success('Response regenerated!');
    } catch (error: any) {
      console.error('Error regenerating:', error);
      toast.error('Failed to regenerate response');
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  // Edit message
  const editMessage = (message: Message) => {
    if (message.role === 'user') {
      setInputMessage(message.content);
      toast.success('Message loaded for editing');
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    
    try {
      setMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  // Export conversation as formatted text
  const exportAsText = () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    const aiModelName = aiModels.find(m => m.id === aiModel)?.name || 'AI';
    let text = `Chat Conversation\n`;
    text += `Model: ${aiModelName}\n`;
    text += `Date: ${new Date().toLocaleString()}\n`;
    text += `Messages: ${messages.length}\n`;
    text += `\n${'='.repeat(80)}\n\n`;

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'You' : aiModelName;
      const timestamp = new Date(message.created_at).toLocaleString();
      text += `[${index + 1}] ${role} - ${timestamp}\n`;
      text += `${'-'.repeat(80)}\n`;
      text += `${message.content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentSessionId || 'export'}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported as text!');
  };

  // Export conversation as Markdown
  const exportAsMarkdown = () => {
    if (messages.length === 0) {
      toast.error('No messages to export');
      return;
    }

    const aiModelName = aiModels.find(m => m.id === aiModel)?.name || 'AI';
    let markdown = `# Chat Conversation\n\n`;
    markdown += `**Model:** ${aiModelName}  \n`;
    markdown += `**Date:** ${new Date().toLocaleString()}  \n`;
    markdown += `**Messages:** ${messages.length}\n\n`;
    markdown += `---\n\n`;

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? '👤 You' : '🤖 ' + aiModelName;
      const timestamp = new Date(message.created_at).toLocaleString();
      markdown += `## ${role}\n`;
      markdown += `*${timestamp}*\n\n`;
      markdown += `${message.content}\n\n`;
      if (index < messages.length - 1) {
        markdown += `---\n\n`;
      }
    });

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${currentSessionId || 'export'}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Conversation exported as Markdown!');
  };

  // Copy entire conversation as formatted text
  const copyConversation = () => {
    if (messages.length === 0) {
      toast.error('No messages to copy');
      return;
    }

    const aiModelName = aiModels.find(m => m.id === aiModel)?.name || 'AI';
    let text = '';

    messages.forEach((message, index) => {
      const role = message.role === 'user' ? 'You' : aiModelName;
      text += `${role}: ${message.content}\n\n`;
    });

    copyToClipboard(text.trim());
  };

  // Share conversation (copy shareable link)
  const shareConversation = () => {
    if (!currentSessionId) {
      toast.error('No active conversation to share');
      return;
    }

    const shareUrl = `${window.location.origin}/chat?session=${currentSessionId}`;
    copyToClipboard(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

  // Toggle favorite
  const toggleFavorite = (messageId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(messageId)) {
        newFavorites.delete(messageId);
        toast.success('Removed from favorites');
      } else {
        newFavorites.add(messageId);
        toast.success('Added to favorites');
      }
      return newFavorites;
    });
  };

  // Show loading state while checking auth
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-light-bg dark:bg-dark-bg">
        <div className="text-center">
          <div className="spinner mb-4"></div>
          <p className="text-light-text-secondary dark:text-dark-text-secondary">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 overflow-hidden">
      {/* Chat Area - Full Width */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with glass effect */}
        <div className="flex-shrink-0 backdrop-blur-xl bg-white/70 dark:bg-black/70 border-b border-gray-200/50 dark:border-gray-800/50 px-6 py-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-xl transform hover:scale-105 transition-transform">
                  <SparklesIcon className="w-7 h-7 text-white dark:text-black" />
                </div>
                {!isTyping && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white dark:border-black rounded-full shadow-lg"></div>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                  AI Assistant
                </h2>
                <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {isTyping ? (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce"></span>
                      <span className="inline-block w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="inline-block w-1.5 h-1.5 bg-black dark:bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      Typing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Online • Ready
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Branch Selector */}
              {currentSessionId && (
                <BranchSelector
                  sessionId={currentSessionId}
                  currentBranchId={messages[0]?.branch_id}
                  onBranchChange={() => currentSessionId && loadMessages(currentSessionId)}
                />
              )}
              
              {messages.length > 0 && (
                <>
                  <button
                    onClick={copyConversation}
                    className="px-3 py-2 text-sm text-black dark:text-white bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium border border-gray-200/50 dark:border-gray-800/50"
                    title="Copy entire conversation"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 inline mr-1" />
                    Copy
                  </button>
                  <button
                    onClick={exportAsMarkdown}
                    className="px-3 py-2 text-sm text-black dark:text-white bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium border border-gray-200/50 dark:border-gray-800/50"
                    title="Export as Markdown"
                  >
                    <DocumentIcon className="w-4 h-4 inline mr-1" />
                    Markdown
                  </button>
                  <button
                    onClick={exportAsText}
                    className="px-3 py-2 text-sm text-black dark:text-white bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium border border-gray-200/50 dark:border-gray-800/50"
                    title="Export as text file"
                  >
                    <DocumentIcon className="w-4 h-4 inline mr-1" />
                    Text
                  </button>
                  {currentSessionId && (
                    <button
                      onClick={shareConversation}
                      className="px-3 py-2 text-sm text-black dark:text-white bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium border border-gray-200/50 dark:border-gray-800/50"
                      title="Share conversation link"
                    >
                      <svg className="w-4 h-4 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      Share
                    </button>
                  )}
                </>
              )}
              {currentSessionId && (
                <button
                  onClick={() => handleDeleteSession(currentSessionId)}
                  className="px-4 py-2 text-sm text-white dark:text-black bg-gradient-to-r from-red-500 to-red-600 dark:from-red-400 dark:to-red-500 hover:from-red-600 hover:to-red-700 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 font-medium"
                >
                  <TrashIcon className="w-4 h-4 inline mr-1" />
                  Delete
                </button>
              )}
              {/* Theme Customizer Button */}
              <button
                onClick={() => setShowThemeCustomizer(!showThemeCustomizer)}
                className="p-2 text-black dark:text-white bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 border border-gray-200/50 dark:border-gray-800/50"
                title="Customize theme"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Theme Customizer Modal */}
        {showThemeCustomizer && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowThemeCustomizer(false)}>
            <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-800/50 p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-black dark:text-white">🎨 Theme Customization</h2>
                <button
                  onClick={() => setShowThemeCustomizer(false)}
                  className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <XMarkIcon className="w-6 h-6 text-black dark:text-white" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Theme Toggle */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Theme Mode</label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => toggleTheme()}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                        theme === 'light'
                          ? 'bg-gradient-to-br from-gray-100 to-white border-black shadow-lg'
                          : 'bg-white/10 border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-2">☀️</div>
                      <div className="font-semibold text-gray-900 dark:text-white">Light</div>
                    </button>
                    <button
                      onClick={() => toggleTheme()}
                      className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                        theme === 'dark'
                          ? 'bg-gradient-to-br from-gray-900 to-black border-white shadow-lg'
                          : 'bg-black/10 border-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-2">🌙</div>
                      <div className="font-semibold text-gray-900 dark:text-white">Dark</div>
                    </button>
                  </div>
                </div>

                {/* Glass Style */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Glass Effect</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(['default', 'strong', 'subtle', 'vibrant'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => {
                          setGlassStyle(style);
                          toast.success(`Glass style: ${style}`);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all capitalize ${
                          glassStyle === style
                            ? 'bg-gradient-to-br from-black/20 to-gray-700/20 dark:from-white/20 dark:to-gray-300/20 border-black dark:border-white shadow-lg'
                            : 'bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
                        }`}
                      >
                        <div className="font-semibold text-gray-900 dark:text-white">{style}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Font Size</label>
                  <div className="flex gap-3">
                    {(['small', 'medium', 'large'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => {
                          setFontSize(size);
                          toast.success(`Font size: ${size}`);
                        }}
                        className={`flex-1 p-4 rounded-2xl border-2 transition-all capitalize ${
                          fontSize === size
                            ? 'bg-gradient-to-br from-black/20 to-gray-700/20 dark:from-white/20 dark:to-gray-300/20 border-black dark:border-white shadow-lg'
                            : 'bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
                        }`}
                      >
                        <div className={`font-semibold text-gray-900 dark:text-white ${
                          size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                        }`}>{size}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Accent Color</label>
                  <div className="grid grid-cols-5 gap-3">
                    {([
                      { name: 'gray', color: 'bg-gray-500' },
                      { name: 'blue', color: 'bg-blue-500' },
                      { name: 'purple', color: 'bg-purple-500' },
                      { name: 'green', color: 'bg-green-500' },
                      { name: 'red', color: 'bg-red-500' },
                    ] as const).map((item) => (
                      <button
                        key={item.name}
                        onClick={() => {
                          setAccentColor(item.name);
                          toast.success(`Accent color: ${item.name}`);
                        }}
                        className={`p-4 rounded-2xl border-2 transition-all ${
                          accentColor === item.name
                            ? 'border-black dark:border-white shadow-lg scale-110'
                            : 'border-gray-300 dark:border-gray-700 hover:scale-105'
                        }`}
                      >
                        <div className={`w-full h-8 rounded-xl ${item.color}`}></div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                    Customizations are saved automatically ✨
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 bg-gradient-to-b from-transparent via-gray-50/30 to-transparent dark:via-gray-900/30" style={{ minHeight: 0 }}>
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center backdrop-blur-xl bg-white/60 dark:bg-black/60 p-8 rounded-3xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl">
                <div className="spinner border-black dark:border-white mb-4 mx-auto"></div>
                <p className="text-gray-700 dark:text-gray-300 font-medium text-sm">
                  Loading messages...
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl px-4">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
                  <SparklesIcon className="w-12 h-12 text-white dark:text-black" />
                </div>
                <h2 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-4">
                  Start a Conversation
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Ask me anything! I can help with coding, writing, analysis, and more.
                </p>
                
                {/* Quick action suggestions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  {[
                    { icon: '💻', text: 'Help me code', prompt: 'Can you help me write some code?' },
                    { icon: '✍️', text: 'Write content', prompt: 'I need help writing content' },
                    { icon: '📊', text: 'Analyze data', prompt: 'Can you help me analyze some data?' },
                    { icon: '🎨', text: 'Get creative', prompt: 'Give me some creative ideas' },
                  ].map((action, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInputMessage(action.prompt)}
                      className="group p-6 rounded-2xl backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600 hover:shadow-xl transition-all text-left transform hover:scale-105"
                    >
                      <div className="text-3xl mb-3">{action.icon}</div>
                      <div className="text-sm font-bold text-black dark:text-white">
                        {action.text}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onMouseEnter={() => setHoveredMessage(message.id)}
                  onMouseLeave={() => setHoveredMessage(null)}
                >
                  <div className="relative group max-w-[85%] md:max-w-[75%]">
                    {/* Avatar/Icon */}
                    <div className={`flex items-start gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${
                        message.role === 'user' 
                          ? 'bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300' 
                          : 'bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300'
                      }`}>
                        {message.role === 'user' ? (
                          <UserCircleIcon className="w-6 h-6 text-gray-100 dark:text-gray-900" />
                        ) : (
                          <SparklesIcon className="w-6 h-6 text-white dark:text-black" />
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div className="flex-1 min-w-0">
                        {/* Message Header with timestamp */}
                        <div className={`flex items-center gap-2 mb-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {message.role === 'user' ? 'You' : aiModels.find(m => m.id === aiModel)?.name || 'AI'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(message.created_at).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>

                        {/* Message Content Bubble */}
                        <div
                          className={`rounded-3xl px-5 py-4 backdrop-blur-xl transition-all duration-200 shadow-lg ${
                            message.role === 'user'
                              ? 'bg-gradient-to-br from-gray-800/90 to-gray-900/90 dark:from-gray-200/90 dark:to-gray-300/90 text-gray-100 dark:text-gray-900 border border-gray-700/50 dark:border-gray-400/50'
                              : 'bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 text-black dark:text-white'
                          } ${hoveredMessage === message.id ? 'shadow-2xl scale-[1.02]' : ''}`}
                        >
                          {/* Message Content with better typography */}
                          <div className={`message-content prose prose-sm max-w-none ${
                            message.role === 'user' 
                              ? 'prose-invert dark:prose-dark text-gray-100 dark:text-gray-900' 
                              : 'prose-gray dark:prose-invert text-black dark:text-white'
                          }`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                // Paragraphs
                                p: ({ children }) => (
                                  <p className={`mb-3 last:mb-0 leading-relaxed ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</p>
                                ),
                                // Headings
                                h1: ({ children }) => (
                                  <h1 className={`text-xl font-bold mb-3 mt-4 first:mt-0 uppercase tracking-wide ${
                                    message.role === 'user' 
                                      ? 'text-gray-50 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className={`text-lg font-bold mb-2 mt-3 first:mt-0 uppercase tracking-wide ${
                                    message.role === 'user' 
                                      ? 'text-gray-50 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className={`text-base font-bold mb-2 mt-3 first:mt-0 uppercase tracking-wide ${
                                    message.role === 'user' 
                                      ? 'text-gray-50 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</h3>
                                ),
                                // Lists
                                ul: ({ children }) => (
                                  <ul className={`list-disc list-inside space-y-1 mb-3 ml-2 ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className={`list-decimal list-inside space-y-1 mb-3 ml-2 ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</ol>
                                ),
                                li: ({ children }) => (
                                  <li className={`leading-relaxed ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</li>
                                ),
                                // Links
                                a: ({ href, children }) => (
                                  <a 
                                    href={href} 
                                    className={`underline hover:no-underline font-medium ${
                                      message.role === 'user' 
                                        ? 'text-gray-200 dark:text-gray-800' 
                                        : 'text-black dark:text-white'
                                    }`}
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                  >
                                    {children}
                                  </a>
                                ),
                                // Tables
                                table: ({ children }) => (
                                  <div className="my-4 overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700">
                                    <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children }) => (
                                  <thead className="bg-gray-100 dark:bg-gray-800">
                                    {children}
                                  </thead>
                                ),
                                tbody: ({ children }) => (
                                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                    {children}
                                  </tbody>
                                ),
                                tr: ({ children }) => (
                                  <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    {children}
                                  </tr>
                                ),
                                th: ({ children }) => (
                                  <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className={`px-4 py-3 text-sm ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-gray-900 dark:text-gray-100'
                                  }`}>
                                    {children}
                                  </td>
                                ),
                                // Horizontal rule
                                hr: () => (
                                  <hr className={`my-4 border-t-2 ${
                                    message.role === 'user' 
                                      ? 'border-gray-600 dark:border-gray-400' 
                                      : 'border-gray-300 dark:border-gray-700'
                                  }`} />
                                ),
                                // Code blocks with CodeBlock component
                                code({ node, inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  return (
                                    <CodeBlock
                                      language={match ? match[1] : ''}
                                      value={String(children).replace(/\n$/, '')}
                                      inline={inline}
                                    />
                                  );
                                },
                                // Blockquotes
                                blockquote: ({ children }) => (
                                  <blockquote className={`border-l-4 pl-4 py-2 my-3 italic ${
                                    message.role === 'user'
                                      ? 'border-gray-600 dark:border-gray-400 text-gray-200 dark:text-gray-800'
                                      : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {children}
                                  </blockquote>
                                ),
                                // Strong/Bold
                                strong: ({ children }) => (
                                  <strong className={`font-bold ${
                                    message.role === 'user' 
                                      ? 'text-gray-50 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</strong>
                                ),
                                // Emphasis/Italic
                                em: ({ children }) => (
                                  <em className={`italic ${
                                    message.role === 'user' 
                                      ? 'text-gray-100 dark:text-gray-900' 
                                      : 'text-black dark:text-white'
                                  }`}>{children}</em>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>

                          {/* Tools Panel - Show function calling results for AI messages */}
                          {message.role === 'assistant' && message.metadata?.tool_results && (
                            <ToolsPanel toolResults={message.metadata.tool_results} isExpanded={false} />
                          )}

                          {/* Message Reactions - Show for AI messages */}
                          {message.role === 'assistant' && (
                            <div className="mt-3">
                              <MessageReactions
                                messageId={message.id}
                                reactions={message.reactions}
                                userReaction={message.user_reaction}
                                rating={message.rating}
                                onReactionUpdate={() => currentSessionId && loadMessages(currentSessionId)}
                              />
                            </div>
                          )}

                          {/* Attachments */}
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                              {message.attachments.map((file, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-2 text-xs font-mono ${
                                    message.role === 'user' 
                                      ? 'text-gray-300 dark:text-gray-700' 
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`}
                                >
                                  {file.type.startsWith('image/') ? (
                                    <PhotoIcon className="w-4 h-4" />
                                  ) : (
                                    <DocumentIcon className="w-4 h-4" />
                                  )}
                                  <span className="truncate">{file.name}</span>
                                  <span className="text-xs opacity-60">
                                    ({(file.size / 1024).toFixed(1)} KB)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Message Actions - Show on hover */}
                    {hoveredMessage === message.id && (
                      <div className={`absolute ${
                        message.role === 'user' ? 'left-0 -translate-x-full pl-2' : 'right-0 translate-x-full pr-2'
                      } top-12 flex flex-col gap-1 animate-fade-in`}>
                        <button
                          onClick={() => copyToClipboard(message.content)}
                          className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white transition-all shadow-sm"
                          title="Copy message"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                        </button>
                        
                        {message.role === 'assistant' && (
                          <>
                            <button
                              onClick={() => speakText(message.content)}
                              className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white transition-all shadow-sm"
                              title="Read aloud"
                            >
                              <SpeakerWaveIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </button>
                            <button
                              onClick={() => regenerateResponse(message.id)}
                              className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white transition-all shadow-sm"
                              title="Regenerate response"
                            >
                              <ArrowPathIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                            </button>
                          </>
                        )}
                        
                        {message.role === 'user' && currentSessionId && (
                          <div className="p-1">
                            <BranchControls
                              sessionId={currentSessionId}
                              messageId={message.id}
                              messageContent={message.content}
                              onBranchCreated={loadMessages}
                            />
                          </div>
                        )}
                        
                        <button
                          onClick={() => deleteMessage(message.id)}
                          className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-all shadow-sm group"
                          title="Delete message"
                        >
                          <TrashIcon className="w-4 h-4 text-gray-700 dark:text-gray-300 group-hover:text-red-500" />
                        </button>
                        
                        <button
                          onClick={() => toggleFavorite(message.id)}
                          className="p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white transition-all shadow-sm"
                          title={favorites.has(message.id) ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          {favorites.has(message.id) ? (
                            <HeartIconSolid className="w-4 h-4 text-black dark:text-white" />
                          ) : (
                            <HeartIcon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicator with Streaming */}
              {isTyping && (
                <div className="flex justify-start animate-fade-in">
                  <div className="flex items-start gap-3 max-w-[85%] md:max-w-[75%]">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-lg">
                      <SparklesIcon className="w-6 h-6 text-white dark:text-black animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                        {aiModels.find(m => m.id === aiModel)?.name || 'AI'}
                      </div>
                      <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl px-5 py-4 shadow-lg backdrop-blur-xl">
                        {streamingMessage ? (
                          <div className="message-content prose prose-sm max-w-none prose-gray dark:prose-invert text-black dark:text-white">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {streamingMessage}
                            </ReactMarkdown>
                            <span className="inline-block w-2 h-4 bg-black dark:bg-white animate-pulse ml-1"></span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                            <div className="flex gap-1">
                              <div className="w-2.5 h-2.5 bg-gradient-to-r from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-200 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                              <div className="w-2.5 h-2.5 bg-gradient-to-r from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-200 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '200ms', animationDuration: '1s' }}></div>
                              <div className="w-2.5 h-2.5 bg-gradient-to-r from-gray-600 to-gray-800 dark:from-gray-400 dark:to-gray-200 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '400ms', animationDuration: '1s' }}></div>
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {loadingTime < 5 ? 'Thinking...' : 
                               loadingTime < 15 ? 'Analyzing...' : 
                               loadingTime < 30 ? 'Processing...' : 
                               'Almost there...'}
                            </span>
                          </div>
                          {loadingTime > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-gray-600 to-black dark:from-gray-400 dark:to-white rounded-full transition-all duration-1000 animate-pulse"
                                  style={{ width: `${Math.min((loadingTime / 60) * 100, 100)}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono text-gray-500 dark:text-gray-500 tabular-nums min-w-[32px]">
                                {loadingTime}s
                              </span>
                            </div>
                          )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-shrink-0 border-t border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl bg-white/70 dark:bg-black/70 shadow-2xl relative">
          
          {/* AI Configuration Drop-up Panel */}
          {showAIConfig && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-40 animate-fade-in"
                onClick={() => setShowAIConfig(false)}
              />
              
              {/* Floating Panel */}
              <div className="absolute bottom-full left-0 right-0 mb-2 mx-4 z-50 animate-slide-up">
                <div className="backdrop-blur-2xl bg-white/95 dark:bg-black/95 border-2 border-gray-200/50 dark:border-gray-800/50 rounded-3xl shadow-2xl overflow-hidden">
                  {/* Header */}
                  <div className="px-6 py-4 bg-gradient-to-r from-gray-50/50 to-gray-100/50 dark:from-gray-900/50 dark:to-gray-800/50 border-b border-gray-200/50 dark:border-gray-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-lg">
                          <SparklesIcon className="w-6 h-6 text-white dark:text-black" />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-black dark:text-white">AI Settings</h3>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Configure your AI assistant</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAIConfig(false)}
                        className="p-2 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
                      >
                        <XMarkIcon className="w-5 h-5 text-black dark:text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Model Selection */}
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white mb-3">
                        AI Model
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {aiModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              setAiModel(model.id);
                              toast.success(`Switched to ${model.name}`);
                            }}
                            className={`p-4 rounded-2xl border-2 backdrop-blur-xl transition-all text-left ${
                              aiModel === model.id
                                ? 'bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black border-black dark:border-white shadow-lg scale-[1.02]'
                                : 'bg-white/50 dark:bg-black/50 text-black dark:text-white border-gray-200/50 dark:border-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600 hover:scale-[1.01]'
                            }`}
                          >
                            <div className="font-bold text-sm">{model.name}</div>
                            <div className="text-xs opacity-80 mt-1">{model.provider} • {model.type}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Temperature Control */}
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white mb-3">
                        Creativity Level: <span className="text-gray-600 dark:text-gray-400">{temperature.toFixed(1)}</span>
                      </label>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Precise</span>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="flex-1 h-3 bg-gray-200/70 dark:bg-gray-800/70 rounded-full appearance-none cursor-pointer accent-black dark:accent-white"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">Creative</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Lower values make output more focused, higher values more creative
                      </p>
                    </div>

                    {/* Feature Toggles */}
                    <div>
                      <label className="block text-sm font-bold text-black dark:text-white mb-3">
                        Features
                      </label>
                      <div className="space-y-3">
                        {/* Streaming Toggle */}
                        <button
                          onClick={() => setUseStreaming(!useStreaming)}
                          className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                            useStreaming
                              ? 'border-green-500/50 bg-green-500/10 hover:bg-green-500/20'
                              : 'border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50 hover:bg-gray-100/50 dark:hover:bg-gray-900/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                useStreaming ? 'bg-green-500/20' : 'bg-gray-200/50 dark:bg-gray-800/50'
                              }`}>
                                <BoltIcon className={`w-6 h-6 ${
                                  useStreaming ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'
                                }`} />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-black dark:text-white">Streaming Mode</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Real-time word-by-word responses</div>
                              </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full transition-all ${
                              useStreaming ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'
                            }`}>
                              <div className={`w-5 h-5 rounded-full bg-white shadow-lg transition-all transform ${
                                useStreaming ? 'translate-x-6' : 'translate-x-0.5'
                              } mt-0.5`} />
                            </div>
                          </div>
                        </button>

                        {/* Quick Prompts */}
                        <button
                          onClick={() => setShowSettings(!showSettings)}
                          className="w-full p-4 rounded-2xl border-2 border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50 hover:bg-gray-100/50 dark:hover:bg-gray-900/50 transition-all text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-200/50 dark:bg-gray-800/50 flex items-center justify-center">
                                <SparklesIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <div className="font-bold text-sm text-black dark:text-white">Quick Prompts</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">Pre-made conversation starters</div>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-black dark:text-white transition-transform ${showSettings ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Quick Prompts Grid */}
                    {showSettings && (
                      <div className="animate-fade-in">
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            'Explain like I\'m 5',
                            'Give me examples',
                            'Be more detailed',
                            'Summarize briefly',
                            'Show me code',
                            'Make it shorter',
                            'Add more context',
                            'List pros and cons',
                          ].map((prompt, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                setInputMessage(prompt);
                                setShowSettings(false);
                                setShowAIConfig(false);
                              }}
                              className="px-3 py-2.5 text-xs rounded-xl backdrop-blur-xl bg-gray-100/70 dark:bg-gray-900/70 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black border border-gray-200/50 dark:border-gray-800/50 transition-all font-medium hover:scale-105 shadow text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="p-6">
          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2 animate-fade-in">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 px-4 py-2 backdrop-blur-xl bg-white/70 dark:bg-black/70 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 shadow-lg"
                >
                  {file.type.startsWith('image/') ? (
                    <PhotoIcon className="w-5 h-5 text-black dark:text-white" />
                  ) : (
                    <DocumentIcon className="w-5 h-5 text-black dark:text-white" />
                  )}
                  <span className="text-sm truncate max-w-[150px] font-medium">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-lg transition-all"
                  >
                    <XMarkIcon className="w-4 h-4 text-black dark:text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              multiple
              accept="image/*,text/*,.pdf,.doc,.docx"
            />
            
            {/* AI Settings Button */}
            <button
              type="button"
              onClick={() => setShowAIConfig(!showAIConfig)}
              className="p-3 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600 rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 group relative"
              title="AI Settings"
            >
              <SparklesIcon className="w-6 h-6 text-black dark:text-white" />
              {/* Active indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-full border-2 border-white dark:border-black"></div>
            </button>
            
            {/* File Attach Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 hover:border-gray-400 dark:hover:border-gray-600 rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || selectedFiles.length >= 5}
              title="Attach files (max 5)"
            >
              <PaperClipIcon className="w-6 h-6 text-black dark:text-white" />
            </button>

            {/* Voice Controls Component */}
            <VoiceControls
              onTranscript={handleVoiceTranscript}
              isSpeaking={isTTSEnabled}
              onToggleSpeech={handleToggleTTS}
            />

            {/* Message Input */}
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-6 py-4 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-lg focus:shadow-xl font-medium"
              disabled={loading}
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={loading || (!inputMessage.trim() && selectedFiles.length === 0)}
              className="p-4 min-w-[60px] bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black border border-gray-700/50 dark:border-gray-400/50 hover:from-gray-700 hover:to-black dark:hover:from-gray-300 dark:hover:to-white rounded-2xl transition-all shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? (
                <div className="spinner border-white dark:border-black"></div>
              ) : (
                <PaperAirplaneIcon className="w-5 h-5" />
              )}
            </button>
          </form>

          {/* Hints */}
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-lg bg-gray-200/70 dark:bg-gray-800/70 font-semibold border border-gray-300/50 dark:border-gray-700/50">Cmd+Enter</kbd>
                <span>Send</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-lg bg-gray-200/70 dark:bg-gray-800/70 font-semibold border border-gray-300/50 dark:border-gray-700/50">Cmd+K</kbd>
                <span>New Chat</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-lg bg-gray-200/70 dark:bg-gray-800/70 font-semibold border border-gray-300/50 dark:border-gray-700/50">Cmd+/</kbd>
                <span>Toggle AI</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-2 py-0.5 rounded-lg bg-gray-200/70 dark:bg-gray-800/70 font-semibold border border-gray-300/50 dark:border-gray-700/50">Esc</kbd>
                <span>Clear Files</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
              {/* Model Badge */}
              <span className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-xl bg-black/5 dark:bg-white/5 border border-gray-300/30 dark:border-gray-700/30">
                <SparklesIcon className="w-3 h-3" />
                {aiModels.find(m => m.id === aiModel)?.name}
              </span>
              {/* Streaming Badge */}
              {useStreaming && (
                <span className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-xl bg-green-500/10 border border-green-500/30">
                  <BoltIcon className="w-3 h-3 text-green-600 dark:text-green-400" />
                  Streaming
                </span>
              )}
              {/* Status Badge */}
              <span className="flex items-center gap-2 px-3 py-1 rounded-full backdrop-blur-xl bg-green-500/10 border border-green-500/30">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                AI Online
              </span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

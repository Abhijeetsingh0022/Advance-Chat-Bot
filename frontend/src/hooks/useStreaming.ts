/**
 * useStreaming Hook
 * Manages streaming message state and callbacks with proper integration
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { streamChatMessage } from '@/lib/api';
import toast from 'react-hot-toast';

export interface StreamOptions {
  model?: string;
  temperature?: number;
  conversationType?: string;
  optimizeFor?: string;
  maxTokens?: number;
}

export interface StreamCallbacks {
  onChunk?: (chunk: string, accumulated: string) => void;
  onComplete?: (data: any) => void;
  onError?: (error: any) => void;
  onMemories?: (memories: any[]) => void;
  onRouting?: (routing: any) => void;
  onTools?: (toolsCount: number) => void;
  onToolCall?: (toolCall: any) => void;
  onToolResult?: (toolName: string, result: any) => void;
}

export interface UseStreamingReturn {
  isStreaming: boolean;
  streamingMessage: string;
  isToolCallActive: boolean;
  streamMessage: (message: string, sessionId: string | null, callbacks: StreamCallbacks, options?: StreamOptions) => Promise<void>;
  resetStreaming: () => void;
}

export function useStreaming(): UseStreamingReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isToolCallActive, setIsToolCallActive] = useState(false);
  const router = useRouter();

  const streamMessage = useCallback(
    async (message: string, sessionId: string | null, callbacks: StreamCallbacks, options?: StreamOptions) => {
      setIsStreaming(true);
      setStreamingMessage('');
      setIsToolCallActive(false);

      let tempSessionId = sessionId;

      try {
        await streamChatMessage(
          message,
          sessionId,
          // onChunk
          (chunk: string, accumulated: string) => {
            setStreamingMessage(accumulated);
            callbacks.onChunk?.(chunk, accumulated);
          },
          // onComplete
          async (data: any) => {
            // Update session if new
            if (!tempSessionId && data.session_id) {
              tempSessionId = data.session_id;
              router.push(`/chat?session=${data.session_id}`, { scroll: false });
            }

            setStreamingMessage('');
            setIsToolCallActive(false);
            setIsStreaming(false);

            callbacks.onComplete?.(data);
          },
          // onError
          (error: any) => {
            const errorMsg = error?.message || 'Streaming failed';
            toast.error(errorMsg);
            setStreamingMessage('');
            setIsToolCallActive(false);
            setIsStreaming(false);
            callbacks.onError?.(error);
          },
          // onMemories
          (memories: any[]) => {
            callbacks.onMemories?.(memories);
          },
          // onRouting
          (routing: any) => {
            console.log('Smart Router selected:', routing.model);
            toast.success(`Using ${routing.model}`, {
              duration: 2000,
            });
            callbacks.onRouting?.(routing);
          },
          // onTools
          (toolsCount: number) => {
            if (toolsCount > 0) {
              toast.success(`${toolsCount} tools enabled`, {
                duration: 2000,
              });
            }
            callbacks.onTools?.(toolsCount);
          },
          // onToolCall
          (toolCall: any) => {
            console.log('Function call:', toolCall);
            setIsToolCallActive(true);
            const funcName = toolCall.function?.name || 'unknown';
            toast.success(`Calling ${funcName}...`, {
              duration: 2000,
            });
            callbacks.onToolCall?.(toolCall);
          },
          // onToolResult
          (toolName: string, result: any) => {
            console.log(`Tool result from ${toolName}:`, result);
            callbacks.onToolResult?.(toolName, result);
          },
          options
        );

        // Trigger sidebar refresh
        window.dispatchEvent(new CustomEvent('sessions-updated'));
      } catch (error: any) {
        console.error('Error streaming message:', error);
        const message = error?.message || 'Streaming failed';
        toast.error(message);
        setStreamingMessage('');
        setIsStreaming(false);
        callbacks.onError?.(error);
      }
    },
    [router]
  );

  const resetStreaming = useCallback(() => {
    setIsStreaming(false);
    setStreamingMessage('');
    setIsToolCallActive(false);
  }, []);

  return {
    isStreaming,
    streamingMessage,
    isToolCallActive,
    streamMessage,
    resetStreaming,
  };
}

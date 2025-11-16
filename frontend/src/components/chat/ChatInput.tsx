/**
 * ChatInput Component
 * Modern message input with black & white theme
 */

'use client';

import React, { useState, useRef, KeyboardEvent, useCallback } from 'react';
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  XMarkIcon,
  SparklesIcon,
  ChevronUpIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { VoiceControls } from '@/components/VoiceControls';
import { useAIConfig } from '@/context/AIConfigContext';

interface ChatInputProps {
  value: string;
  loading: boolean;
  files: File[];
  onChange: (value: string) => void;
  onSubmit: () => void;
  onFileAdd: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  onAISettingsToggle: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  loading,
  files,
  onChange,
  onSubmit,
  onFileAdd,
  onFileRemove,
  onAISettingsToggle,
  placeholder = 'Type your message...',
  disabled = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const { config, models, setModel } = useAIConfig();

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!loading && value.trim()) {
        onSubmit();
      }
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileAdd(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileAdd(Array.from(e.dataTransfer.files));
    }
  };

  // Handle voice input result
  const handleVoiceResult = useCallback((transcript: string) => {
    onChange(value + (value ? ' ' : '') + transcript);
  }, [value, onChange]);

  // Get current model name
  const currentModel = models.find(m => m.id === config.model);
  const modelDisplayName = currentModel?.name || 'Select Model';

  return (
    <div className="border-t border-gray-200 bg-white dark:border-gray-900 dark:bg-black">
      <div className="w-full px-4 py-3">
        {/* File Attachments Preview */}
        {files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <PaperClipIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <span className="max-w-[150px] truncate text-gray-900 dark:text-white">
                  {file.name}
                </span>
                <button
                  onClick={() => onFileRemove(index)}
                  className="rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-200 hover:text-red-500 dark:hover:bg-gray-800"
                  aria-label="Remove file"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Container */}
        <div
          className={`relative rounded-xl transition-all ${
            isDragging
              ? 'border-2 border-white bg-gray-100 dark:bg-gray-800'
              : 'border border-gray-200 bg-gray-50 focus-within:border-gray-400 dark:border-gray-800 dark:bg-gray-900 dark:focus-within:border-gray-600'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90 dark:bg-gray-900/90">
              <div className="text-center">
                <PaperClipIcon className="mx-auto mb-2 h-10 w-10 text-black dark:text-white" />
                <p className="text-sm font-medium text-black dark:text-white">
                  Drop files here
                </p>
              </div>
            </div>
          )}

          <div className="flex items-end gap-2 p-3">
            {/* File Attachment Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || loading}
              className="flex-shrink-0 rounded-lg bg-white p-2 text-black shadow-sm transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800"
              aria-label="Attach file"
              title="Attach file"
            >
              <PaperClipIcon className="h-5 w-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileChange}
              className="hidden"
              accept="image/*,application/pdf,.txt,.doc,.docx"
            />

            {/* Text Input */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled || loading}
              rows={1}
              className="max-h-[200px] min-h-[40px] flex-1 resize-none border-none bg-transparent py-2 text-base text-gray-900 placeholder-gray-400 outline-none focus:outline-none focus:ring-0 disabled:opacity-50 dark:text-white dark:placeholder-gray-600"
              style={{ lineHeight: '1.5' }}
            />

            {/* Voice Controls */}
            <div className="flex-shrink-0">
              <VoiceControls onVoiceResult={handleVoiceResult} disabled={disabled || loading} />
            </div>

            {/* AI Settings Button */}
            <button
              onClick={onAISettingsToggle}
              className="flex-shrink-0 rounded-lg bg-white p-2 text-black shadow-sm transition-all hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:shadow-none dark:hover:bg-gray-800"
              aria-label="AI Settings"
              title="AI Settings"
            >
              <SparklesIcon className="h-5 w-5" />
            </button>

            {/* Send Button */}
            <button
              onClick={onSubmit}
              disabled={disabled || loading || !value.trim()}
              className="flex-shrink-0 rounded-lg bg-black p-2 text-white shadow-lg transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              aria-label="Send message"
              title="Send message (⌘ + Enter)"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black dark:border-t-transparent" />
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-2 flex items-center justify-between">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModelMenu(!showModelMenu)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              <span className="max-w-[150px] truncate">{modelDisplayName}</span>
              <ChevronUpIcon className={`h-3 w-3 transition-transform ${showModelMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* Model Menu Dropdown */}
            {showModelMenu && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowModelMenu(false)}
                />
                <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900">
                  <div className="max-h-80 overflow-y-auto p-2">
                    <div className="mb-2 px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Select Model
                    </div>
                    {models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setModel(model.id);
                          setShowModelMenu(false);
                        }}
                        className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                          config.model === model.id
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{model.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {model.provider} • {model.type}
                            </div>
                          </div>
                          {config.model === model.id && (
                            <CheckIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* File count */}
          {files.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-500">
              {files.length} file{files.length !== 1 ? 's' : ''} attached
            </div>
          )}

          {/* Character count (optional) */}
          {value.length > 0 && (
            <div className="ml-auto text-xs text-gray-400 dark:text-gray-600">
              {value.length} characters
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * AIConfigPanel Component
 * Simple two-panel modal for AI configuration
 * Left panel: Model selection | Right panel: Settings
 */

'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  XMarkIcon,
  SparklesIcon,
  FireIcon,
  BoltIcon,
  Cog6ToothIcon,
  CheckIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CodeBracketIcon,
  EyeIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { useAIConfig } from '@/context/AIConfigContext';
import { AIModel } from '@/types/chat';

interface AIConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Model categories
const MODEL_CATEGORIES = [
  { category: 'General', icon: ChatBubbleLeftRightIcon, color: 'text-blue-600', type: 'general' },
  { category: 'Reasoning', icon: SparklesIcon, color: 'text-purple-600', type: 'reasoning' },
  { category: 'Coding', icon: CodeBracketIcon, color: 'text-green-600', type: 'coding' },
  { category: 'Vision', icon: EyeIcon, color: 'text-orange-600', type: 'image' },
  { category: 'Text', icon: DocumentTextIcon, color: 'text-cyan-600', type: 'text' },
] as const;

// Optimization profiles
const OPTIMIZATION_PROFILES = [
  { id: 'quality', label: 'Quality', icon: SparklesIcon },
  { id: 'balanced', label: 'Balanced', icon: Cog6ToothIcon },
  { id: 'cost', label: 'Cost', icon: FireIcon },
] as const;

export const AIConfigPanel: React.FC<AIConfigPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    config,
    models,
    isLoadingModels,
    updateConfig,
    setModel,
    setTemperature,
    setStreaming,
    resetConfig,
  } = useAIConfig();

  // Debug logging
  React.useEffect(() => {
    console.log('AIConfigPanel mounted/updated - isOpen:', isOpen, 'models:', models.length, 'isLoadingModels:', isLoadingModels);
  }, [isOpen, models, isLoadingModels]);

  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const currentModel = models.find((m: AIModel) => m.id === config.model);

  // Temperature label helper
  const getTemperatureLabel = useCallback((temp: number): string => {
    if (temp < 0.7) return 'Precise';
    if (temp < 1.3) return 'Balanced';
    return 'Creative';
  }, []);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else {
      previousActiveElementRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard event handler
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }

      // Focus trap
      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusableElements || focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[
          focusableElements.length - 1
        ] as HTMLElement;

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  // Handle reset and close
  const handleReset = useCallback(() => {
    resetConfig();
    onClose();
  }, [resetConfig, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-config-title"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative flex h-[85vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
      >
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 px-6 py-4 backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/95">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <h2 id="ai-config-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              AI Settings
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            aria-label="Close settings panel"
          >
            <XMarkIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Two-Panel Layout */}
        <div className="flex w-full pt-[73px]">
          {/* Left Panel - Model Selection */}
          <div className="flex w-80 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            {/* Model List Header */}
            <div className="border-b border-gray-200 p-4 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Select Model
              </h3>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Choose your AI model
              </p>
            </div>

            {/* Models List */}
            <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900">
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-8">
                  <div className="space-y-2 text-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto" />
                    <p className="text-xs text-gray-500 dark:text-gray-400">Loading models...</p>
                  </div>
                </div>
              ) : models && models.length > 0 ? (
                <>
                  {/* Debug Info - Remove in production */}
                  <div className="mb-4 text-xs text-gray-500 dark:text-gray-400">
                    {models.length} model(s) available
                  </div>
                  <div className="space-y-4">
                    {MODEL_CATEGORIES.map(({ category, icon: Icon, color, type }) => {
                      const categoryModels = models.filter(
                        (m: AIModel) => m.type === type
                      );

                      if (categoryModels.length === 0) return null;

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex items-center gap-2 px-2">
                            <Icon className={`h-4 w-4 ${color} dark:opacity-80`} aria-hidden="true" />
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              {category} ({categoryModels.length})
                            </h4>
                          </div>
                          <div className="space-y-1" role="group" aria-label={category}>
                            {categoryModels.map((model: AIModel) => {
                              const isSelected = config.model === model.id;
                              return (
                                <button
                                  key={model.id}
                                  onClick={() => setModel(model.id)}
                                  className={[
                                    'group w-full rounded-lg border px-3 py-2.5 text-left transition-all',
                                    isSelected
                                      ? 'border-blue-600 bg-blue-50 shadow-sm dark:border-blue-500 dark:bg-blue-950'
                                      : 'border-transparent bg-white hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800',
                                  ].join(' ')}
                                  aria-pressed={isSelected}
                                  aria-label={`Select ${model.name} by ${model.provider}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                        {model.name}
                                      </p>
                                      <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                                        {model.provider}
                                      </p>
                                    </div>
                                    {isSelected && (
                                      <CheckIcon
                                        className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
                                        aria-hidden="true"
                                      />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Fallback: Show all models if none matched categories */}
                    {MODEL_CATEGORIES.every(({ type }) => 
                      models.filter((m: AIModel) => m.type === type).length === 0
                    ) && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 px-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            All Models
                          </h4>
                        </div>
                        <div className="space-y-1">
                          {models.map((model: AIModel) => {
                            const isSelected = config.model === model.id;
                            return (
                              <button
                                key={model.id}
                                onClick={() => setModel(model.id)}
                                className={[
                                  'group w-full rounded-lg border px-3 py-2.5 text-left transition-all',
                                  isSelected
                                    ? 'border-blue-600 bg-blue-50 shadow-sm dark:border-blue-500 dark:bg-blue-950'
                                    : 'border-transparent bg-white hover:border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800',
                                ].join(' ')}
                                aria-pressed={isSelected}
                                aria-label={`Select ${model.name} by ${model.provider}`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                                      {model.name}
                                    </p>
                                    <p className="truncate text-xs text-gray-600 dark:text-gray-400">
                                      {model.provider} • {model.type}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <CheckIcon
                                      className="h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400"
                                      aria-hidden="true"
                                    />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">No models available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Models: {models ? models.length : 0}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Model Info */}
            <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950">
                <p className="mb-1 text-xs text-gray-600 dark:text-gray-400">
                  Current Model
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {currentModel?.name}
                </p>
                <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                  {currentModel?.provider}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Settings */}
          <div className="flex flex-1 flex-col">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Temperature Control */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                      <FireIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      Temperature
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-900 dark:bg-gray-800 dark:text-white"
                        aria-live="polite"
                      >
                        {config.temperature.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {getTemperatureLabel(config.temperature)}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-orange-500 dark:bg-gray-700"
                    aria-label="Temperature slider"
                    aria-valuemin={0}
                    aria-valuemax={2}
                    aria-valuenow={config.temperature}
                    aria-valuetext={`${config.temperature.toFixed(1)} - ${getTemperatureLabel(config.temperature)}`}
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>0.0</span>
                    <span>1.0</span>
                    <span>2.0</span>
                  </div>
                </div>

                {/* Streaming Toggle */}
                <div className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/30">
                      <BoltIcon className="h-5 w-5 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Streaming Mode
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        See responses in real-time
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setStreaming(!config.useStreaming)}
                    className={[
                      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                      config.useStreaming
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-700',
                    ].join(' ')}
                    role="switch"
                    aria-checked={config.useStreaming}
                    aria-label="Toggle streaming mode"
                  >
                    <span
                      className={[
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform',
                        config.useStreaming ? 'translate-x-5' : 'translate-x-0.5',
                      ].join(' ')}
                    />
                  </button>
                </div>

                {/* Optimization Profile */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                    <Cog6ToothIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Optimization
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {OPTIMIZATION_PROFILES.map(({ id, label, icon: Icon }) => {
                      const isSelected = config.optimize_for === id;
                      return (
                        <button
                          key={id}
                          onClick={() =>
                            updateConfig({ ...config, optimize_for: id as any })
                          }
                          className={[
                            'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                            isSelected
                              ? 'border-blue-600 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700 dark:hover:bg-gray-800',
                          ].join(' ')}
                          aria-pressed={isSelected}
                          aria-label={`Optimize for ${label}`}
                        >
                          <Icon
                            className={[
                              'h-6 w-6 transition-colors',
                              isSelected
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400',
                            ].join(' ')}
                            aria-hidden="true"
                          />
                          <span
                            className={[
                              'text-sm font-medium',
                              isSelected
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300',
                            ].join(' ')}
                          >
                            {label}
                          </span>
                          {isSelected && (
                            <CheckIcon
                              className="absolute right-2 top-2 h-4 w-4 text-blue-600 dark:text-blue-400"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                  <p className="mb-3 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                    Active Configuration
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Model</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {currentModel?.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Streaming</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {config.useStreaming ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Optimization</span>
                      <span className="font-medium capitalize text-gray-900 dark:text-white">
                        {config.optimize_for}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-800 dark:bg-gray-900/50">
              <button
                onClick={handleReset}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                aria-label="Reset to default settings"
              >
                <ArrowPathIcon className="h-4 w-4" aria-hidden="true" />
                Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                aria-label="Apply and close settings"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

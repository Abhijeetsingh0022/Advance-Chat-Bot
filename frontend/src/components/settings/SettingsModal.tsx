/**
 * SettingsModal - Comprehensive Control Center
 * Unified settings interface for all ChatBot customizations
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PaintBrushIcon,
  CpuChipIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
  BellIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { useAppearance } from '@/context/AppearanceContext';
import { useAIConfig } from '@/context/AIConfigContext';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 
  | 'appearance' 
  | 'ai' 
  | 'chat' 
  | 'memory' 
  | 'notifications' 
  | 'account' 
  | 'advanced';

const tabs = [
  { id: 'appearance' as const, label: 'Appearance', icon: PaintBrushIcon, desc: 'Theme & visuals' },
  { id: 'ai' as const, label: 'AI Config', icon: CpuChipIcon, desc: 'Models & parameters' },
  { id: 'chat' as const, label: 'Chat', icon: ChatBubbleLeftRightIcon, desc: 'Conversation settings' },
  { id: 'memory' as const, label: 'Memory', icon: SparklesIcon, desc: 'Memory management' },
  { id: 'notifications' as const, label: 'Notifications', icon: BellIcon, desc: 'Alerts & sounds' },
  { id: 'account' as const, label: 'Account', icon: UserCircleIcon, desc: 'Profile & security' },
  { id: 'advanced' as const, label: 'Advanced', icon: Cog6ToothIcon, desc: 'Developer options' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] animate-fade-in bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div 
          className="flex h-[90vh] w-full max-w-6xl animate-fade-in-up overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-black"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left Sidebar - Tabs */}
          <div className="w-64 border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950">
            {/* Header */}
            <div className="border-b border-gray-200 p-4 dark:border-gray-800">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-black dark:text-white">Settings</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800"
                  aria-label="Close"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search settings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500 dark:focus:border-white"
                />
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className="overflow-y-auto p-2" style={{ maxHeight: 'calc(90vh - 140px)' }}>
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={[
                      'flex w-full items-start gap-3 rounded-lg p-3 text-left transition-all',
                      activeTab === tab.id
                        ? 'bg-white text-black shadow-sm dark:bg-gray-900 dark:text-white'
                        : 'text-gray-600 hover:bg-white hover:text-black dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white',
                    ].join(' ')}
                  >
                    <tab.icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{tab.label}</div>
                      <div className={[
                        'text-xs',
                        activeTab === tab.id 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-500 dark:text-gray-500'
                      ].join(' ')}>
                        {tab.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* Right Content Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Content Header */}
            <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                {tabs.find(t => t.id === activeTab)?.icon && (
                  <div className="rounded-lg bg-black p-2 dark:bg-white">
                    {React.createElement(tabs.find(t => t.id === activeTab)!.icon, {
                      className: 'h-5 w-5 text-white dark:text-black'
                    })}
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-black dark:text-white">
                    {tabs.find(t => t.id === activeTab)?.label}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {tabs.find(t => t.id === activeTab)?.desc}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'appearance' && <AppearanceSettings />}
              {activeTab === 'ai' && <AISettings />}
              {activeTab === 'chat' && <ChatSettings />}
              {activeTab === 'memory' && <MemorySettings />}
              {activeTab === 'notifications' && <NotificationSettings />}
              {activeTab === 'account' && <AccountSettings />}
              {activeTab === 'advanced' && <AdvancedSettings />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ==================== TAB COMPONENTS ====================

const AppearanceSettings: React.FC = () => {
  const { settings, updateSettings, isLoading } = useAppearance();
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(settings.theme);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>(settings.font_size);
  const [messageStyle, setMessageStyle] = useState<'classic' | 'rounded' | 'bubble'>(settings.message_style);
  const [compactMode, setCompactMode] = useState(settings.compact_mode);
  const [accentColor, setAccentColor] = useState<string>(settings.accent_color);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with global settings when they change
  useEffect(() => {
    setThemeMode(settings.theme);
    setFontSize(settings.font_size);
    setMessageStyle(settings.message_style);
    setCompactMode(settings.compact_mode);
    setAccentColor(settings.accent_color);
  }, [settings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        theme: themeMode,
        font_size: fontSize,
        message_style: messageStyle,
        compact_mode: compactMode,
        accent_color: accentColor,
      });
      toast.success('Appearance settings saved');
    } catch (error) {
      console.error('Failed to save appearance:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await updateSettings({
        theme: 'system',
        font_size: 'medium',
        message_style: 'rounded',
        compact_mode: false,
        accent_color: 'gray',
      });
      toast.success('Reset to defaults');
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Theme Mode */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
          Theme Mode
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light' },
            { id: 'dark', label: 'Dark' },
            { id: 'system', label: 'System' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setThemeMode(id as any)}
              className={[
                'rounded-xl border-2 p-4 transition-all',
                themeMode === id
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
            >
              <div className="text-center text-sm font-medium">{label}</div>
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
              onClick={() => setFontSize(id as any)}
              className={[
                'rounded-xl border-2 p-4 transition-all',
                fontSize === id
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
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
              onClick={() => setMessageStyle(id as any)}
              className={[
                'rounded-xl border-2 p-4 transition-all',
                messageStyle === id
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
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

      {/* Accent Color */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
          Accent Color
        </label>
        <div className="grid grid-cols-6 gap-3">
          {[
            { id: 'gray', color: 'bg-gray-500' },
            { id: 'blue', color: 'bg-blue-500' },
            { id: 'purple', color: 'bg-purple-500' },
            { id: 'green', color: 'bg-green-500' },
            { id: 'orange', color: 'bg-orange-500' },
            { id: 'red', color: 'bg-red-500' },
          ].map(({ id, color }) => (
            <button
              key={id}
              onClick={() => setAccentColor(id)}
              className={[
                'aspect-square rounded-lg border-2 transition-all',
                accentColor === id
                  ? 'border-black scale-110 dark:border-white'
                  : 'border-gray-200 hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-600',
              ].join(' ')}
            >
              <div className={`h-full w-full rounded-md ${color}`} />
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
          Display Density
        </label>
        <button
          onClick={() => setCompactMode(!compactMode)}
          className={[
            'flex w-full items-center justify-between rounded-xl border-2 p-4 transition-all',
            compactMode
              ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600',
          ].join(' ')}
        >
          <div>
            <div className="text-left text-sm font-semibold">Compact Mode</div>
            <div className="text-left text-xs opacity-70">
              Reduce spacing for more content
            </div>
          </div>
          <div className={[
            'h-6 w-11 rounded-full transition-colors',
            compactMode ? 'bg-white dark:bg-black' : 'bg-gray-300 dark:bg-gray-700'
          ].join(' ')}>
            <div className={[
              'h-5 w-5 rounded-full transition-transform',
              compactMode ? 'translate-x-6 bg-black dark:bg-white' : 'translate-x-0.5 bg-white dark:bg-gray-500',
              'mt-0.5'
            ].join(' ')} />
          </div>
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <button 
          onClick={handleReset}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900">
          {isSaving ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const AISettings: React.FC = () => {
  const { config, updateConfig, models: availableModels } = useAIConfig();
  const [selectedModel, setSelectedModel] = useState(config.model);
  const [temperature, setTemperature] = useState(config.temperature);
  const [maxTokens, setMaxTokens] = useState(config.max_tokens);
  const [streamingEnabled, setStreamingEnabled] = useState(config.useStreaming);
  const [optimizeFor, setOptimizeFor] = useState<'cost' | 'balanced' | 'quality'>(config.optimize_for || 'balanced');
  const [isSaving, setIsSaving] = useState(false);

  // Sync with global config
  useEffect(() => {
    setSelectedModel(config.model);
    setTemperature(config.temperature);
    setMaxTokens(config.max_tokens);
    setStreamingEnabled(config.useStreaming);
    setOptimizeFor(config.optimize_for || 'balanced');
  }, [config]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateConfig({
        model: selectedModel,
        temperature,
        max_tokens: maxTokens,
        useStreaming: streamingEnabled,
        optimize_for: optimizeFor,
      });
      toast.success('AI settings saved');
    } catch (error) {
      console.error('Failed to save AI config:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await updateConfig({
        model: 'openai/gpt-oss-20b:free',
        temperature: 0.7,
        max_tokens: 2000,
        useStreaming: true,
        optimize_for: 'balanced',
      });
      toast.success('Reset to defaults');
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Model Selection */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
          Default Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
        >
          {availableModels.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.provider})
            </option>
          ))}
        </select>
      </div>

      {/* Temperature */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <label className="text-sm font-semibold text-black dark:text-white">
            Temperature
          </label>
          <span className="text-sm text-gray-600 dark:text-gray-400">{temperature.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-500">
          <span>Focused</span>
          <span>Balanced</span>
          <span>Creative</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
          Max Response Length (tokens)
        </label>
        <input
          type="number"
          min="100"
          max="8000"
          step="100"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
        />
      </div>

      {/* Optimization Mode */}
      <div>
        <label className="mb-3 block text-sm font-semibold text-black dark:text-white">
          Optimize For
        </label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'cost', label: 'Cost', desc: 'Lower pricing' },
            { id: 'balanced', label: 'Balanced', desc: 'Good mix' },
            { id: 'quality', label: 'Quality', desc: 'Best results' },
          ].map(({ id, label, desc }) => (
            <button
              key={id}
              onClick={() => setOptimizeFor(id as any)}
              className={[
                'rounded-xl border-2 p-4 transition-all',
                optimizeFor === id
                  ? 'border-black bg-black text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600',
              ].join(' ')}
            >
              <div className="text-sm font-medium">{label}</div>
              <div className="text-xs opacity-70">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-black dark:text-white">
          Features
        </label>

        {/* Streaming */}
        <button
          onClick={() => setStreamingEnabled(!streamingEnabled)}
          className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-black dark:text-white">Streaming Responses</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Real-time response generation</div>
          </div>
          <div className={[
            'h-6 w-11 rounded-full transition-colors',
            streamingEnabled ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
          ].join(' ')}>
            <div className={[
              'h-5 w-5 rounded-full transition-transform',
              streamingEnabled ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
              'mt-0.5'
            ].join(' ')} />
          </div>
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <button 
          onClick={handleReset}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900">
          {isSaving ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const ChatSettings: React.FC = () => {
  const [autoSave, setAutoSave] = useState(true);
  const [historyRetention, setHistoryRetention] = useState('forever');
  const [messageLimit, setMessageLimit] = useState(100);
  const [suggestedReplies, setSuggestedReplies] = useState(true);
  const [codeHighlighting, setCodeHighlighting] = useState(true);
  const [latexRendering, setLatexRendering] = useState(true);
  const [linkPreviews, setLinkPreviews] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(10);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from backend
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.settings.getChatSettings();
        const data = response?.data || response;
        if (data) {
          setAutoSave(data.auto_save ?? true);
          setHistoryRetention(data.history_retention || 'forever');
          setMessageLimit(data.message_limit || 100);
          setSuggestedReplies(data.suggested_replies ?? true);
          setCodeHighlighting(data.code_highlighting ?? true);
          setLatexRendering(data.latex_rendering ?? true);
          setLinkPreviews(data.link_previews ?? true);
          setMaxFileSize(data.max_file_size || 10);
        }
      } catch (error) {
        console.error('Failed to load chat settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateChatSettings({
        auto_save: autoSave,
        history_retention: historyRetention,
        message_limit: messageLimit,
        suggested_replies: suggestedReplies,
        code_highlighting: codeHighlighting,
        latex_rendering: latexRendering,
        link_previews: linkPreviews,
        max_file_size: maxFileSize,
      });
      toast.success('Chat settings saved');
    } catch (error) {
      console.error('Failed to save chat settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateChatSettings({
        auto_save: true,
        history_retention: 'forever',
        message_limit: 100,
        suggested_replies: true,
        code_highlighting: true,
        latex_rendering: true,
        link_previews: true,
        max_file_size: 10,
      });
      toast.success('Reset to defaults');
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* History & Storage */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          History & Storage
        </h4>

        {/* Auto-Save */}
        <button
          onClick={() => setAutoSave(!autoSave)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-black dark:text-white">Auto-Save Conversations</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Automatically save all chats</div>
          </div>
          <div className={[
            'h-6 w-11 rounded-full transition-colors',
            autoSave ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
          ].join(' ')}>
            <div className={[
              'h-5 w-5 rounded-full transition-transform',
              autoSave ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
              'mt-0.5'
            ].join(' ')} />
          </div>
        </button>

        {/* History Retention */}
        <div className="mb-3">
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">
            History Retention
          </label>
          <select
            value={historyRetention}
            onChange={(e) => setHistoryRetention(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
          >
            <option value="7d">7 days</option>
            <option value="30d">30 days</option>
            <option value="90d">90 days</option>
            <option value="forever">Forever</option>
          </select>
        </div>

        {/* Message Limit */}
        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">
            Messages per Session
          </label>
          <input
            type="number"
            min="10"
            max="500"
            step="10"
            value={messageLimit}
            onChange={(e) => setMessageLimit(parseInt(e.target.value))}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
          />
        </div>
      </div>

      {/* Display Features */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Display Features
        </h4>

        <div className="space-y-3">
          {/* Suggested Replies */}
          <button
            onClick={() => setSuggestedReplies(!suggestedReplies)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Suggested Replies</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Show smart reply suggestions</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              suggestedReplies ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                suggestedReplies ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          {/* Code Highlighting */}
          <button
            onClick={() => setCodeHighlighting(!codeHighlighting)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Code Syntax Highlighting</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Colorize code blocks</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              codeHighlighting ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                codeHighlighting ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          {/* LaTeX Rendering */}
          <button
            onClick={() => setLatexRendering(!latexRendering)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">LaTeX Math Rendering</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Render mathematical equations</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              latexRendering ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                latexRendering ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          {/* Link Previews */}
          <button
            onClick={() => setLinkPreviews(!linkPreviews)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Link Previews</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Show previews for shared URLs</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              linkPreviews ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                linkPreviews ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          File Upload
        </h4>
        <div>
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">
            Max File Size (MB)
          </label>
          <input
            type="number"
            min="1"
            max="100"
            value={maxFileSize}
            onChange={(e) => setMaxFileSize(parseInt(e.target.value))}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <button 
          onClick={handleReset}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900">
          {isSaving ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const MemorySettings: React.FC = () => {
  const [autoExtraction, setAutoExtraction] = useState(true);
  const [extractionThreshold, setExtractionThreshold] = useState(5);
  const [autoVerification, setAutoVerification] = useState(false);
  const [retentionPeriod, setRetentionPeriod] = useState('forever');
  const [enabledCategories, setEnabledCategories] = useState({
    facts: true,
    preferences: true,
    context: true,
    technical: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.settings.getMemorySettings();
        const data = response?.data || response;
        if (data) {
          setAutoExtraction(data.auto_extraction ?? true);
          setExtractionThreshold(data.extraction_threshold || 5);
          setAutoVerification(data.auto_verification ?? false);
          setRetentionPeriod(data.retention_period || 'forever');
          setEnabledCategories(data.enabled_categories || { facts: true, preferences: true, context: true, technical: true });
        }
      } catch (error) {
        console.error('Failed to load memory settings:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateMemorySettings({
        auto_extraction: autoExtraction,
        extraction_threshold: extractionThreshold,
        auto_verification: autoVerification,
        retention_period: retentionPeriod,
        enabled_categories: enabledCategories,
      });
      toast.success('Memory settings saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateMemorySettings({
        auto_extraction: true,
        extraction_threshold: 5,
        auto_verification: false,
        retention_period: 'forever',
        enabled_categories: { facts: true, preferences: true, context: true, technical: true },
      });
      toast.success('Reset to defaults');
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Extraction Settings */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Memory Extraction
        </h4>

        {/* Auto Extraction */}
        <button
          onClick={() => setAutoExtraction(!autoExtraction)}
          className="mb-3 flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-black dark:text-white">Automatic Extraction</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Extract memories from conversations</div>
          </div>
          <div className={[
            'h-6 w-11 rounded-full transition-colors',
            autoExtraction ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
          ].join(' ')}>
            <div className={[
              'h-5 w-5 rounded-full transition-transform',
              autoExtraction ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
              'mt-0.5'
            ].join(' ')} />
          </div>
        </button>

        {/* Extraction Threshold */}
        <div className="mb-3">
          <label className="mb-2 block text-sm font-medium text-black dark:text-white">
            Extraction Threshold (messages)
          </label>
          <input
            type="number"
            min="2"
            max="20"
            value={extractionThreshold}
            onChange={(e) => setExtractionThreshold(parseInt(e.target.value))}
            className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
          />
        </div>

        {/* Auto Verification */}
        <button
          onClick={() => setAutoVerification(!autoVerification)}
          className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-black dark:text-white">Require Manual Approval</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Review before saving memories</div>
          </div>
          <div className={[
            'h-6 w-11 rounded-full transition-colors',
            autoVerification ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
          ].join(' ')}>
            <div className={[
              'h-5 w-5 rounded-full transition-transform',
              autoVerification ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
              'mt-0.5'
            ].join(' ')} />
          </div>
        </button>
      </div>

      {/* Memory Categories */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Memory Categories
        </h4>
        <div className="space-y-3">
          {Object.entries(enabledCategories).map(([key, enabled]) => (
            <button
              key={key}
              onClick={() => setEnabledCategories(prev => ({ ...prev, [key]: !enabled }))}
              className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
            >
              <div className="text-left">
                <div className="text-sm font-medium capitalize text-black dark:text-white">{key}</div>
              </div>
              <div className={[
                'h-6 w-11 rounded-full transition-colors',
                enabled ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
              ].join(' ')}>
                <div className={[
                  'h-5 w-5 rounded-full transition-transform',
                  enabled ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                  'mt-0.5'
                ].join(' ')} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Retention */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Data Retention
        </h4>
        <select
          value={retentionPeriod}
          onChange={(e) => setRetentionPeriod(e.target.value)}
          className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
        >
          <option value="30d">30 days</option>
          <option value="90d">90 days</option>
          <option value="1y">1 year</option>
          <option value="forever">Forever</option>
        </select>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <button 
          onClick={handleReset}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900">
          {isSaving ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const NotificationSettings: React.FC = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [chatUpdates, setChatUpdates] = useState(true);
  const [memoryEvents, setMemoryEvents] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.settings.getNotifications();
        const data = response?.data || response;
        if (data) {
          setEmailNotifications(data.email_notifications ?? true);
          setChatUpdates(data.chat_notifications ?? true);
          setSecurityAlerts(data.security_alerts ?? true);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateNotifications({
        email_notifications: emailNotifications,
        chat_notifications: chatUpdates,
        security_alerts: securityAlerts,
      });
      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateNotifications({
        email_notifications: true,
        chat_notifications: true,
        security_alerts: true,
      });
      toast.success('Reset to defaults');
    } catch (error) {
      console.error('Failed to reset:', error);
      toast.error('Failed to reset');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Email Notifications
        </h4>
        <div className="space-y-3">
          <button
            onClick={() => setEmailNotifications(!emailNotifications)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Enable Email Notifications</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Receive updates via email</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              emailNotifications ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                emailNotifications ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>
        </div>
      </div>

      {/* In-App Notifications */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          In-App Notifications
        </h4>
        <div className="space-y-3">
          <button
            onClick={() => setChatUpdates(!chatUpdates)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Chat Updates</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">New message notifications</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              chatUpdates ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                chatUpdates ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          <button
            onClick={() => setMemoryEvents(!memoryEvents)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Memory Events</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Memory extraction alerts</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              memoryEvents ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                memoryEvents ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          <button
            onClick={() => setSecurityAlerts(!securityAlerts)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Security Alerts</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Login attempts & changes</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              securityAlerts ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                securityAlerts ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          <button
            onClick={() => setSystemUpdates(!systemUpdates)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">System Updates</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Feature announcements</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              systemUpdates ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                systemUpdates ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>
        </div>
      </div>

      {/* Sound Effects */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Sound Effects
        </h4>
        <button
          onClick={() => setSoundEffects(!soundEffects)}
          className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-black dark:text-white">Notification Sounds</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Play sound for notifications</div>
          </div>
          <div className={[
            'h-6 w-11 rounded-full transition-colors',
            soundEffects ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
          ].join(' ')}>
            <div className={[
              'h-5 w-5 rounded-full transition-transform',
              soundEffects ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
              'mt-0.5'
            ].join(' ')} />
          </div>
        </button>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <button 
          onClick={handleReset}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900">
          {isSaving ? 'Resetting...' : 'Reset to Defaults'}
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const AccountSettings: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await api.settings.getProfile();
        const data = response?.data || response;
        if (data) {
          setFullName(data.full_name || '');
          setEmail(data.email || '');
          setBio(data.bio || '');
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    };
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      await api.settings.updateProfile({
        full_name: fullName,
        bio: bio,
      });
      toast.success('Profile updated');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      setIsSaving(true);
      await api.settings.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Profile Information */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Profile Information
        </h4>
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
              rows={3}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
            />
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Change Password
        </h4>
        <div className="space-y-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-black dark:text-white">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-3 text-black focus:border-black focus:outline-none dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:border-white"
            />
          </div>

          <button 
            onClick={handleChangePassword}
            disabled={isSaving}
            className="w-full rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
            {isSaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>

      {/* Active Sessions */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Active Sessions
        </h4>
        <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            View and manage your active sessions from the Advanced tab.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
        <button 
          onClick={() => { setFullName(''); setEmail(''); setBio(''); }}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-gray-200 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-900">
          Cancel
        </button>
        <button 
          onClick={handleSaveProfile}
          disabled={isSaving}
          className="flex-1 rounded-xl border-2 border-black bg-black px-4 py-3 font-medium text-white transition-all hover:bg-gray-900 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-gray-100">
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const AdvancedSettings: React.FC = () => {
  const [debugMode, setDebugMode] = useState(false);
  const [betaFeatures, setBetaFeatures] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleExportChats = async () => {
    try {
      setIsExporting(true);
      const sessions = await api.chat.getSessions(100);
      const blob = new Blob([JSON.stringify(sessions.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-sessions-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Chat history exported');
    } catch (error) {
      toast.error('Failed to export chats');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMemories = async () => {
    try {
      setIsExporting(true);
      const response = await api.memory.listMemories(1000);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-memories-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Memories exported');
    } catch (error) {
      toast.error('Failed to export memories');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      const [sessions, memories, settings] = await Promise.all([
        api.chat.getSessions(100),
        api.memory.listMemories(1000),
        api.settings.getAIPreferences(),
      ]);
      const data = {
        sessions: sessions.data,
        memories: memories.data,
        settings: settings.data,
        exported_at: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-complete-export-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('All data exported');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearChats = async () => {
    if (!confirm('Are you sure you want to clear all chat history? This cannot be undone.')) return;
    try {
      const sessions = await api.chat.getSessions(100);
      await Promise.all(sessions.data.map((s: any) => api.chat.deleteSession(s.id)));
      toast.success('Chat history cleared');
    } catch (error) {
      toast.error('Failed to clear chats');
    }
  };

  const handleClearMemories = async () => {
    if (!confirm('Are you sure you want to clear all memories? This cannot be undone.')) return;
    try {
      const memories = await api.memory.listMemories(1000);
      await Promise.all(memories.data.map((m: any) => api.memory.deleteMemory(m.id)));
      toast.success('Memories cleared');
    } catch (error) {
      toast.error('Failed to clear memories');
    }
  };

  const handleResetSettings = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) return;
    try {
      // Reset all settings by updating with empty objects (backend will use defaults)
      await Promise.all([
        api.settings.updateAppearance({}),
        api.settings.updateAIPreferences({}),
        api.settings.updateChatSettings({}),
        api.settings.updateMemorySettings({}),
        api.settings.updateNotifications({}),
      ]);
      toast.success('Settings reset to defaults');
      window.location.reload();
    } catch (error) {
      toast.error('Failed to reset settings');
    }
  };

  const handleDeleteAccount = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      setTimeout(() => setShowDeleteConfirm(false), 10000);
      return;
    }
    const finalConfirm = confirm('FINAL WARNING: This will permanently delete your account and all data. This CANNOT be undone. Are you absolutely sure?');
    if (!finalConfirm) {
      setShowDeleteConfirm(false);
      return;
    }
    try {
      // Delete account functionality - implement endpoint if not exists
      toast.error('Account deletion not yet implemented. Contact support.');
      setShowDeleteConfirm(false);
    } catch (error) {
      toast.error('Failed to delete account');
    }
  };

  return (
    <div className="space-y-8">
      {/* Import/Export */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Data Management
        </h4>
        <div className="space-y-3">
          <button 
            onClick={handleExportChats}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600">
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Export All Chats</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{isExporting ? 'Exporting...' : 'Download as JSON'}</div>
            </div>
            <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </button>

          <button 
            onClick={handleExportMemories}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600">
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Export Memories</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{isExporting ? 'Exporting...' : 'Download as JSON'}</div>
            </div>
            <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </button>

          <button 
            onClick={handleExportAll}
            disabled={isExporting}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600">
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Download All Data</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">{isExporting ? 'Exporting...' : 'Complete data archive'}</div>
            </div>
            <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </button>
        </div>
      </div>

      {/* Developer Options */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-black dark:text-white">
          Developer Options
        </h4>
        <div className="space-y-3">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Debug Mode</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Show verbose console logs</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              debugMode ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                debugMode ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>

          <button
            onClick={() => setBetaFeatures(!betaFeatures)}
            className="flex w-full items-center justify-between rounded-xl border-2 border-gray-200 bg-white p-4 transition-all hover:border-gray-400 dark:border-gray-800 dark:bg-black dark:hover:border-gray-600"
          >
            <div className="text-left">
              <div className="text-sm font-medium text-black dark:text-white">Beta Features</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Enable experimental features</div>
            </div>
            <div className={[
              'h-6 w-11 rounded-full transition-colors',
              betaFeatures ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
            ].join(' ')}>
              <div className={[
                'h-5 w-5 rounded-full transition-transform',
                betaFeatures ? 'translate-x-6 bg-white dark:bg-black' : 'translate-x-0.5 bg-white dark:bg-gray-500',
                'mt-0.5'
              ].join(' ')} />
            </div>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h4 className="mb-4 text-sm font-semibold text-red-600 dark:text-red-400">
          ⚠️ Danger Zone
        </h4>
        <div className="space-y-3">
          <button 
            onClick={handleClearChats}
            className="flex w-full items-center justify-between rounded-xl border-2 border-red-200 bg-red-50 p-4 transition-all hover:border-red-400 dark:border-red-900 dark:bg-red-950/20 dark:hover:border-red-700">
            <div className="text-left">
              <div className="text-sm font-medium text-red-600 dark:text-red-400">Clear All Chats</div>
              <div className="text-xs text-red-500 dark:text-red-500">Permanently delete all conversations</div>
            </div>
          </button>

          <button 
            onClick={handleClearMemories}
            className="flex w-full items-center justify-between rounded-xl border-2 border-red-200 bg-red-50 p-4 transition-all hover:border-red-400 dark:border-red-900 dark:bg-red-950/20 dark:hover:border-red-700">
            <div className="text-left">
              <div className="text-sm font-medium text-red-600 dark:text-red-400">Clear All Memories</div>
              <div className="text-xs text-red-500 dark:text-red-500">Permanently delete all memories</div>
            </div>
          </button>

          <button 
            onClick={handleResetSettings}
            className="flex w-full items-center justify-between rounded-xl border-2 border-red-200 bg-red-50 p-4 transition-all hover:border-red-400 dark:border-red-900 dark:bg-red-950/20 dark:hover:border-red-700">
            <div className="text-left">
              <div className="text-sm font-medium text-red-600 dark:text-red-400">Reset All Settings</div>
              <div className="text-xs text-red-500 dark:text-red-500">Restore default settings</div>
            </div>
          </button>

          <button 
            onClick={handleDeleteAccount}
            className="flex w-full items-center justify-between rounded-xl border-2 border-red-600 bg-red-600 p-4 transition-all hover:bg-red-700 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-700">
            <div className="text-left">
              <div className="text-sm font-medium text-white">Delete Account</div>
              <div className="text-xs text-red-100">{showDeleteConfirm ? 'Click again to confirm' : 'Permanently delete your account'}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

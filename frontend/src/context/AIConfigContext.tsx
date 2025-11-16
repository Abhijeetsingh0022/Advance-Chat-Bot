/**
 * AIConfigContext
 * Provides AI configuration state and settings
 */

'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { AIConfig, AIModel } from '@/types/chat';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store';

interface AIConfigContextValue {
  config: AIConfig;
  models: AIModel[];
  isLoadingModels: boolean;
  updateConfig: (updates: Partial<AIConfig>) => void;
  setModel: (modelId: string) => void;
  setTemperature: (temperature: number) => void;
  setStreaming: (enabled: boolean) => void;
  resetConfig: () => void;
}

const AIConfigContext = createContext<AIConfigContextValue | undefined>(undefined);

const DEFAULT_CONFIG: AIConfig = {
  model: 'openai/gpt-oss-20b:free',
  temperature: 0.7,
  useStreaming: true,
  optimize_for: 'balanced',
  max_tokens: 2000,
};

interface AIConfigProviderProps {
  children: ReactNode;
}

export function AIConfigProvider({ children }: AIConfigProviderProps) {
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [models, setModels] = useState<AIModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const { isAuthenticated } = useAuthStore();

  // Load AI preferences from backend on mount
  useEffect(() => {
    const loadPreferences = async () => {
      // Skip if not authenticated
      if (!isAuthenticated) {
        setIsLoadingModels(false);
        return;
      }

      try {
        setIsLoadingModels(true);
        const response = await api.settings.getAIPreferences();
        
        if (response.data) {
          // The response contains all settings, we need ai_preferences
          const allSettings = response.data;
          const preferences = allSettings.ai_preferences || allSettings;
          
          setConfig((prev) => ({
            ...prev,
            model: preferences.default_model || prev.model,
            temperature: preferences.temperature ?? prev.temperature,
            useStreaming: preferences.stream_responses ?? prev.useStreaming,
            max_tokens: preferences.max_tokens || prev.max_tokens,
            optimize_for: preferences.optimize_for || prev.optimize_for,
          }));
        }
      } catch (error) {
        console.error('Failed to load AI preferences:', error);
        // Use defaults on error
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadPreferences();
  }, [isAuthenticated]);

  // Load available models from backend
  useEffect(() => {
    const loadModels = async () => {
      // Skip if not authenticated
      if (!isAuthenticated) {
        setIsLoadingModels(false);
        return;
      }

      setIsLoadingModels(true);
      try {
        console.log('Fetching models from backend...');
        // Add cache-busting timestamp
        const timestamp = new Date().getTime();
        const response = await api.chat.getModels();
        console.log('Models response:', response);
        console.log('Raw models data:', JSON.stringify(response.data?.models, null, 2));
        
        if (response.data?.models && Array.isArray(response.data.models)) {
          // Map backend models to frontend AIModel format
          const backendModels: AIModel[] = response.data.models.map((m: any) => ({
            id: m.id,
            name: m.name,
            type: m.type || 'general',
            provider: m.provider,
            supports_streaming: m.supports_streaming ?? true,
            supports_function_calling: m.supports_function_calling ?? false,
            context_window: m.context_window,
            cost_per_1k_tokens: m.cost_per_1k_tokens,
          }));
          
          console.log(`✓ Loaded ${backendModels.length} models from backend:`, backendModels.map(m => m.name));
          console.log('Model types:', backendModels.map(m => `${m.name}: ${m.type}`));
          setModels(backendModels);
        } else {
          console.warn('Invalid response format from backend');
          setModels([]);
        }
      } catch (error) {
        console.error('Failed to load models from backend:', error);
        setModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    loadModels();
  }, [isAuthenticated]);

  const updateConfig = useCallback((updates: Partial<AIConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    
    // Persist to backend only if authenticated
    if (!isAuthenticated) return;
    
    api.settings.updateAIPreferences({
      default_model: updates.model,
      temperature: updates.temperature,
      stream_responses: updates.useStreaming,
      max_tokens: updates.max_tokens,
      optimize_for: updates.optimize_for,
    }).catch(err => console.error('Failed to save AI preferences:', err));
  }, [isAuthenticated]);

  const setModel = useCallback((modelId: string) => {
    setConfig((prev) => ({ ...prev, model: modelId }));
    
    if (!isAuthenticated) return;
    
    api.settings.updateAIPreferences({
      default_model: modelId,
    }).catch(err => console.error('Failed to save model preference:', err));
  }, [isAuthenticated]);

  const setTemperature = useCallback((temperature: number) => {
    const clamped = Math.max(0, Math.min(2, temperature));
    setConfig((prev) => ({ ...prev, temperature: clamped }));
    
    if (!isAuthenticated) return;
    
    api.settings.updateAIPreferences({
      temperature: clamped,
    }).catch(err => console.error('Failed to save temperature:', err));
  }, [isAuthenticated]);

  const setStreaming = useCallback((enabled: boolean) => {
    setConfig((prev) => ({ ...prev, useStreaming: enabled }));
    
    if (!isAuthenticated) return;
    
    api.settings.updateAIPreferences({
      stream_responses: enabled,
    }).catch(err => console.error('Failed to save streaming preference:', err));
  }, [isAuthenticated]);

  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_CONFIG);
    
    if (!isAuthenticated) return;
    
    api.settings.updateAIPreferences({
      default_model: DEFAULT_CONFIG.model,
      temperature: DEFAULT_CONFIG.temperature,
      stream_responses: DEFAULT_CONFIG.useStreaming,
      max_tokens: DEFAULT_CONFIG.max_tokens,
      optimize_for: DEFAULT_CONFIG.optimize_for,
    }).catch(err => console.error('Failed to reset preferences:', err));
  }, [isAuthenticated]);

  const value: AIConfigContextValue = {
    config,
    models,
    isLoadingModels,
    updateConfig,
    setModel,
    setTemperature,
    setStreaming,
    resetConfig,
  };

  return <AIConfigContext.Provider value={value}>{children}</AIConfigContext.Provider>;
}

export function useAIConfig() {
  const context = useContext(AIConfigContext);
  if (context === undefined) {
    throw new Error('useAIConfig must be used within an AIConfigProvider');
  }
  return context;
}

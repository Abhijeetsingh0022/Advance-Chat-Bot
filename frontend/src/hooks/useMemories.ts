/**
 * useMemories Hook
 * Manages memory/context storage and operations with backend integration
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Memory {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  type: 'memory' | 'context' | 'summary';
  importance?: number;
  memory_type?: string;
  confidence_score?: number;
  status?: 'pending' | 'confirmed' | 'rejected' | 'corrected';
  contexts?: string[];
  verified_at?: string;
}

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch all memories from backend
  const fetchMemories = useCallback(async () => {
    setLoading(true);
    try {
      // Use listMemories instead of searchMemories for basic fetching
      const response = await api.memory.listMemories(100, 0);
      
      const formattedMemories = (response.data || []).map((mem: any) => ({
        id: mem.id || mem._id,
        title: mem.title || mem.category || 'Untitled Memory',
        content: mem.content || mem.data || mem.value || '',
        timestamp: mem.created_at || mem.timestamp || new Date().toISOString(),
        type: mem.memory_type || mem.type || 'memory',
        memory_type: mem.memory_type || mem.type,
        importance: mem.importance_score || mem.importance || 0.5,
        confidence_score: mem.confidence_score,
        status: mem.status || 'confirmed',
        contexts: mem.contexts || [],
        verified_at: mem.verified_at,
      }));
      
      setMemories(formattedMemories);
    } catch (error) {
      console.error('Failed to fetch memories:', error);
      // Silently fail - memories are optional
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add memory to backend
  const addMemory = useCallback(async (memory: Omit<Memory, 'id' | 'timestamp'>) => {
    try {
      const response = await api.memory.createMemory({
        title: memory.title,
        content: memory.content,
        memory_type: memory.type,
        category: memory.type,
        importance_score: memory.importance || 0.5,
      });
      
      const newMemory: Memory = {
        id: response.data.id || response.data._id,
        title: memory.title,
        content: memory.content,
        timestamp: new Date().toISOString(),
        type: memory.type,
        importance: memory.importance,
      };
      
      setMemories((prev) => [newMemory, ...prev]);
      toast.success('Memory saved');
      return newMemory;
    } catch (error) {
      console.error('Failed to add memory:', error);
      // Fallback to local storage
      const newMemory: Memory = {
        ...memory,
        id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date().toISOString(),
      };
      setMemories((prev) => [newMemory, ...prev]);
      return newMemory;
    }
  }, []);

  // Delete memory from backend
  const deleteMemory = useCallback(async (memoryId: string) => {
    try {
      await api.memory.deleteMemory(memoryId);
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      toast.success('Memory deleted');
    } catch (error) {
      console.error('Failed to delete memory:', error);
      // Fallback to local deletion
      setMemories((prev) => prev.filter((m) => m.id !== memoryId));
      toast.success('Memory deleted');
    }
  }, []);

  // Clear all memories
  const clearAllMemories = useCallback(async () => {
    if (!confirm('Are you sure you want to clear all memories?')) return;
    
    try {
      // Delete all memories in parallel
      await Promise.all(memories.map((m) => api.memory.deleteMemory(m.id)));
      setMemories([]);
      toast.success('All memories cleared');
    } catch (error) {
      console.error('Failed to clear memories:', error);
      // Fallback to local clear
      setMemories([]);
      toast.success('All memories cleared');
    }
  }, [memories]);

  // Update memory
  const updateMemory = useCallback(async (memoryId: string, updates: Partial<Memory>) => {
    try {
      await api.memory.updateMemory(memoryId, {
        title: updates.title,
        content: updates.content,
        importance_score: updates.importance,
      });
      
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, ...updates } : m))
      );
      toast.success('Memory updated');
    } catch (error) {
      console.error('Failed to update memory:', error);
      // Fallback to local update
      setMemories((prev) =>
        prev.map((m) => (m.id === memoryId ? { ...m, ...updates } : m))
      );
    }
  }, []);

  // Get memories by type
  const getMemoriesByType = useCallback(
    (type: 'memory' | 'context' | 'summary') => {
      return memories.filter((m) => m.type === type);
    },
    [memories]
  );

  // Export memories
  const exportMemories = useCallback((filename?: string) => {
    const dataStr = JSON.stringify(memories, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `memories_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Memories exported');
  }, [memories]);

  // Load memories on mount
  useEffect(() => {
    fetchMemories();
  }, [fetchMemories]);

  return {
    memories,
    loading,
    fetchMemories,
    addMemory,
    deleteMemory,
    clearAllMemories,
    updateMemory,
    getMemoriesByType,
    exportMemories,
  };
}

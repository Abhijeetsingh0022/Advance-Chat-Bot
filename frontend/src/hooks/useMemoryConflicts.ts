/**
 * useMemoryConflicts Hook
 * Manages memory conflict detection and resolution
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface ConflictMemory {
  id: string;
  content: string;
  similarity_score: number;
  conflict_type: string;
  memory_type?: string;
  created_at: string;
}

interface Conflict {
  memory_id: string;
  conflicting_memories: ConflictMemory[];
  conflict_count: number;
}

export function useMemoryConflicts() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnresolvedConflicts, setHasUnresolvedConflicts] = useState(false);

  // Detect conflicts
  const detectConflicts = useCallback(async (memoryId?: string) => {
    setLoading(true);
    try {
      const response = await api.memory.detectConflicts(memoryId);
      const conflictData = response.data || [];
      setConflicts(conflictData);
      setHasUnresolvedConflicts(conflictData.length > 0);
      
      if (conflictData.length > 0) {
        toast.error(`${conflictData.length} memory conflict${conflictData.length > 1 ? 's' : ''} detected`, {
          duration: 5000,
        });
      }
      
      return conflictData;
    } catch (error) {
      console.error('Failed to detect conflicts:', error);
      setConflicts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Consolidate memories
  const consolidate = useCallback(async (memoryIds: string[]) => {
    try {
      await api.memory.consolidateMemories(memoryIds);
      toast.success('Memories consolidated successfully');
      
      // Remove resolved conflict
      setConflicts((prev) =>
        prev.filter((c) => !memoryIds.includes(c.memory_id))
      );
      setHasUnresolvedConflicts((prev) => conflicts.length - 1 > 0);
      
      return true;
    } catch (error: any) {
      console.error('Failed to consolidate memories:', error);
      toast.error(error.response?.data?.detail || 'Failed to consolidate');
      return false;
    }
  }, [conflicts.length]);

  // Get consolidation suggestions
  const getSuggestions = useCallback(async (limit = 10) => {
    try {
      const response = await api.memory.getConsolidationSuggestions(limit);
      return response.data || [];
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }, []);

  // Auto-detect conflicts on mount
  useEffect(() => {
    detectConflicts();
  }, [detectConflicts]);

  return {
    conflicts,
    loading,
    hasUnresolvedConflicts,
    conflictCount: conflicts.length,
    detectConflicts,
    consolidate,
    getSuggestions,
  };
}

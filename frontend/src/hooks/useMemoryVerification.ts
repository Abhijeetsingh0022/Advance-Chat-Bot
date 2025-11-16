/**
 * useMemoryVerification Hook
 * Manages memory verification operations and state
 */

import { useState, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface PendingMemory {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  category?: string;
  importance_score: number;
  confidence_score: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'corrected';
  verified_at?: string;
  created_at: string;
  contexts?: string[];
}

export function useMemoryVerification() {
  const [pending, setPending] = useState<PendingMemory[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch pending memories
  const fetchPending = useCallback(async (limit = 50) => {
    setLoading(true);
    try {
      const response = await api.memory.getPendingMemories(limit);
      setPending(response.data || []);
    } catch (error: any) {
      console.error('Failed to fetch pending memories:', error);
      // Don't show error toast on initial load to avoid spam
      // Only log to console for debugging
      if (error.response?.status !== 404) {
        // Only show error if it's not a 404 (endpoint might not exist yet)
        console.warn('Memory verification endpoint may not be available');
      }
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify a single memory
  const verify = useCallback(async (
    memoryId: string,
    action: 'confirm' | 'reject' | 'correct',
    correctedContent?: string,
    feedback?: string
  ) => {
    try {
      console.log('=== Memory Verification Debug ===');
      console.log('Memory ID:', memoryId);
      console.log('ID Type:', typeof memoryId);
      console.log('ID Length:', memoryId?.length);
      console.log('Action:', action);
      
      const requestData: any = {
        action, // Send action directly (not status)
      };

      if (correctedContent) {
        requestData.corrected_content = correctedContent;
      }
      if (feedback) {
        requestData.feedback = feedback;
      }

      console.log('Request data:', requestData);
      
      await api.memory.verifyMemory(memoryId, requestData);

      // Remove from pending list
      setPending((prev) => prev.filter((m) => m.id !== memoryId));

      const actionText = action === 'confirm' ? 'confirmed' : action === 'reject' ? 'rejected' : 'corrected';
      toast.success(`Memory ${actionText}`);
      
      // Trigger refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (error: any) {
      console.error('Failed to verify memory:', error);
      toast.error(error.response?.data?.detail || 'Failed to verify memory');
      throw error;
    }
  }, []);

  // Bulk verify memories
  const bulkVerify = useCallback(async (
    memoryIds: string[],
    action: 'confirm' | 'reject'
  ) => {
    try {
      const promises = memoryIds.map((id) => verify(id, action));
      await Promise.all(promises);
      toast.success(`${memoryIds.length} memories ${action}ed`);
    } catch (error) {
      console.error('Failed to bulk verify memories:', error);
      toast.error('Some memories failed to verify');
    }
  }, [verify]);

  // Refresh pending memories
  const refresh = useCallback(() => {
    fetchPending();
  }, [fetchPending]);

  // Load pending memories on mount and when refresh trigger changes
  useEffect(() => {
    fetchPending();
  }, [fetchPending, refreshTrigger]);

  return {
    pending,
    loading,
    pendingCount: pending.length,
    verify,
    bulkVerify,
    refresh,
  };
}

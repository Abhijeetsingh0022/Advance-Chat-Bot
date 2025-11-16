/**
 * MemoryDashboard Component
 * Modern memory management with black & white theme
 */

'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import PendingMemoriesPanel from './PendingMemoriesPanel';
import MemoryVerificationCard from './MemoryVerificationCard';
import {
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  LockClosedIcon,
  ArrowPathIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AnalyticsData {
  overview: {
    total_memories: number;
    verified_count: number;
    pending_count: number;
    rejected_count: number;
    avg_confidence: number;
    avg_importance: number;
  };
  by_type: Record<string, number>;
  by_status: Record<string, number>;
  health_score: number;
  insights: Array<{
    type: string;
    message: string;
    priority: string;
    action?: string;
  }>;
}

interface ConflictData {
  memory_id: string;
  conflicting_memories: Array<{
    id: string;
    content: string;
    similarity_score: number;
    conflict_type: string;
  }>;
  conflict_count: number;
}

interface MemoryDashboardProps {
  userId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const MemoryDashboard: React.FC<MemoryDashboardProps> = ({ userId, isOpen = true, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'conflicts' | 'analytics'>('overview');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);

      const analyticsResponse = await api.memory.getAnalyticsDashboard('30d');
      setAnalytics(analyticsResponse.data);

      const conflictsResponse = await api.memory.detectConflicts();
      setConflicts(conflictsResponse.data || []);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleExport = async () => {
    try {
      const response = await api.memory.exportMemories({
        format: 'json',
        include_relationships: true,
      });

      const dataStr = JSON.stringify(response.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `memories_export_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Memories exported successfully');
    } catch (error) {
      console.error('Failed to export memories:', error);
      toast.error('Failed to export memories');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      await api.memory.importMemories({
        memories: Array.isArray(data) ? data : [data],
        format: 'json',
        merge_strategy: 'skip_duplicates',
      });

      toast.success('Memories imported successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to import memories:', error);
      toast.error('Failed to import memories');
    }
  };

  const handleConsolidate = async (memoryIds: string[]) => {
    try {
      await api.memory.consolidateMemories(memoryIds);
      toast.success('Memories consolidated successfully');
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to consolidate memories:', error);
      toast.error('Failed to consolidate memories');
    }
  };

  if (!isOpen) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto mb-3 h-12 w-12 animate-spin text-white" />
          <p className="text-sm text-white">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm">
      {/* Modal Container */}
      <div className="flex h-full items-center justify-center p-4">
        {/* Modal Content */}
        <div className="relative h-full max-h-[90vh] w-full max-w-7xl overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-black">
          {/* Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-lg border-2 border-gray-200 bg-white p-2 text-gray-600 transition-all hover:border-black hover:text-black dark:border-gray-800 dark:bg-black dark:text-gray-400 dark:hover:border-white dark:hover:text-white"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}

          {/* Scrollable Content */}
          <div className="h-full overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-black p-3 shadow-lg dark:bg-white">
                    <SparklesIcon className="h-6 w-6 text-white dark:text-black" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-black dark:text-white">Memory Dashboard</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Manage, verify, and analyze your conversation memories
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExport}
                    className="flex items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-gray-900"
                  >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:border-black hover:bg-gray-50 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-gray-900">
                    <ArrowUpTrayIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                    <input type="file" accept=".json" onChange={handleImport} className="hidden" />
                  </label>
                  <button
                    onClick={fetchDashboardData}
                    disabled={refreshing}
                    className="rounded-lg border-2 border-gray-200 bg-white p-2 text-black transition-all hover:border-black hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white dark:hover:bg-gray-900"
                  >
                    <ArrowPathIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="border-b-2 border-gray-200 dark:border-gray-800">
                <nav className="flex gap-2 overflow-x-auto">
                  {[
                    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
                    { id: 'pending', label: 'Pending', icon: ShieldCheckIcon, badge: analytics?.overview.pending_count },
                    { id: 'conflicts', label: 'Conflicts', icon: ExclamationTriangleIcon, badge: conflicts.length },
                    { id: 'analytics', label: 'Analytics', icon: SparklesIcon },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-all ${
                          activeTab === tab.id
                            ? 'border-black text-black dark:border-white dark:text-white'
                            : 'border-transparent text-gray-600 hover:border-gray-400 hover:text-black dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        {tab.label}
                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                            {tab.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {activeTab === 'overview' && analytics && (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    {analytics?.overview && (
                      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <StatCard label="Total Memories" value={analytics.overview.total_memories} icon={SparklesIcon} />
                        <StatCard label="Verified" value={analytics.overview.verified_count} icon={ShieldCheckIcon} />
                        <StatCard label="Pending" value={analytics.overview.pending_count} icon={ExclamationTriangleIcon} />
                        <StatCard label="Health Score" value={`${analytics.health_score}/100`} icon={ChartBarIcon} />
                      </div>
                    )}

                    {/* Health Score Bar */}
                    {analytics?.health_score !== undefined && (
                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-black dark:text-white">Memory System Health</h3>
                          <span className="text-2xl font-bold text-black dark:text-white">{analytics.health_score}/100</span>
                        </div>
                        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                          <div
                            className={`h-full rounded-full transition-all ${
                              analytics.health_score >= 80 ? 'bg-black dark:bg-white' : analytics.health_score >= 60 ? 'bg-gray-600 dark:bg-gray-400' : 'bg-gray-400 dark:bg-gray-600'
                            }`}
                            style={{ width: `${analytics.health_score}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Insights */}
                    {analytics?.insights && analytics.insights.length > 0 && (
                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">AI Insights & Recommendations</h3>
                        <div className="space-y-3">
                          {analytics.insights.slice(0, 5).map((insight, index) => (
                            <div
                              key={index}
                              className={`rounded-lg border-l-4 p-4 ${
                                insight.priority === 'high'
                                  ? 'border-black bg-gray-100 dark:border-white dark:bg-gray-900'
                                  : insight.priority === 'medium'
                                  ? 'border-gray-600 bg-gray-50 dark:border-gray-400 dark:bg-gray-950'
                                  : 'border-gray-400 bg-gray-50 dark:border-gray-600 dark:bg-gray-950'
                              }`}
                            >
                              <p className="mb-1 text-sm font-medium text-black dark:text-white">{insight.message}</p>
                              {insight.action && <p className="text-xs text-gray-600 dark:text-gray-400">Action: {insight.action}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Memory Distribution */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">By Type</h3>
                        <div className="space-y-3">
                          {analytics?.by_type && Object.entries(analytics.by_type).map(([type, count]) => (
                            <div key={type} className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{type}</span>
                              <span className="text-sm font-bold text-black dark:text-white">{count}</span>
                            </div>
                          ))}
                          {(!analytics?.by_type || Object.keys(analytics.by_type).length === 0) && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">By Status</h3>
                        <div className="space-y-3">
                          {analytics?.by_status && Object.entries(analytics.by_status).map(([status, count]) => (
                            <div key={status} className="flex items-center justify-between">
                              <span className="text-sm font-medium capitalize text-gray-700 dark:text-gray-300">{status}</span>
                              <span className="text-sm font-bold text-black dark:text-white">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pending' && <PendingMemoriesPanel maxDisplay={50} onVerificationComplete={fetchDashboardData} />}

                {activeTab === 'conflicts' && (
                  <div className="space-y-4">
                    {conflicts.length === 0 ? (
                      <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                        <ShieldCheckIcon className="mx-auto mb-3 h-16 w-16 text-black dark:text-white" />
                        <p className="mb-1 text-base font-medium">No conflicts detected</p>
                        <p className="text-sm">All memories are consistent</p>
                      </div>
                    ) : (
                      conflicts.map((conflict) => (
                        <div key={conflict.memory_id} className="rounded-xl border-2 border-red-500 bg-white p-6 dark:bg-black">
                          <div className="mb-4 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                              <h4 className="text-lg font-semibold text-black dark:text-white">
                                {conflict.conflict_count} Conflicting {conflict.conflict_count === 1 ? 'Memory' : 'Memories'}
                              </h4>
                            </div>
                            <button
                              onClick={() => handleConsolidate([conflict.memory_id, ...conflict.conflicting_memories.map((m) => m.id)])}
                              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                            >
                              Consolidate
                            </button>
                          </div>
                          <div className="space-y-3">
                            {conflict.conflicting_memories.map((mem) => (
                              <div key={mem.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400">{mem.conflict_type}</span>
                                  <span className="text-xs font-bold text-red-600 dark:text-red-400">{Math.round(mem.similarity_score * 100)}% similar</span>
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gray-200">{mem.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'analytics' && analytics && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Average Confidence</p>
                        <p className="text-3xl font-bold text-black dark:text-white">{Math.round(analytics.overview.avg_confidence * 100)}%</p>
                      </div>
                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Average Importance</p>
                        <p className="text-3xl font-bold text-black dark:text-white">{Math.round(analytics.overview.avg_importance * 100)}%</p>
                      </div>
                      <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                        <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-400">Verification Rate</p>
                        <p className="text-3xl font-bold text-black dark:text-white">
                          {analytics.overview.total_memories > 0 ? Math.round((analytics.overview.verified_count / analytics.overview.total_memories) * 100) : 0}%
                        </p>
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
                      <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">Quick Actions</h3>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <button
                          onClick={() => setActiveTab('pending')}
                          className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 text-left transition-all hover:border-black dark:border-gray-800 dark:bg-gray-900 dark:hover:border-white"
                        >
                          <ShieldCheckIcon className="h-6 w-6 text-black dark:text-white" />
                          <div>
                            <p className="font-medium text-black dark:text-white">Verify Pending</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{analytics.overview.pending_count} memories awaiting verification</p>
                          </div>
                        </button>
                        <button
                          onClick={() => setActiveTab('conflicts')}
                          className="flex items-center gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 text-left transition-all hover:border-black dark:border-gray-800 dark:bg-gray-900 dark:hover:border-white"
                        >
                          <ExclamationTriangleIcon className="h-6 w-6 text-black dark:text-white" />
                          <div>
                            <p className="font-medium text-black dark:text-white">Resolve Conflicts</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{conflicts.length} conflicts need attention</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// StatCard Component
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon }) => {
  return (
    <div className="rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-black">
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-black dark:text-white">{value}</p>
        </div>
        <div className="rounded-lg bg-black p-3 dark:bg-white">
          <Icon className="h-6 w-6 text-white dark:text-black" />
        </div>
      </div>
    </div>
  );
};

export default MemoryDashboard;

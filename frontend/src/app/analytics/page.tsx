'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { analyticsAPI } from '@/lib/api';
import { AnalyticsSummary, ModelUsageEntry } from '@/types';
import { 
  ChartBarIcon, 
  ClockIcon, 
  CpuChipIcon, 
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

type Period = 'day' | 'week' | 'month' | 'year';

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('week');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modelUsage, setModelUsage] = useState<ModelUsageEntry[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    loadAnalytics();
  }, [isAuthenticated, router, period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load summary and model usage
      const [summaryRes, modelsRes] = await Promise.all([
        analyticsAPI.getSummary({ period }),
        analyticsAPI.getModelUsage({ days: period === 'day' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 365 })
      ]);

      setSummary(summaryRes.data);
      setModelUsage(modelsRes.data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 1) return `${(seconds * 1000).toFixed(0)}ms`;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Track your AI usage, model performance, and conversation statistics
              </p>
            </div>
            
            <button
              onClick={loadAnalytics}
              disabled={loading}
              className="p-3 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-black/80 border border-gray-200/50 dark:border-gray-800/50 hover:scale-110 transition-all shadow-lg hover:shadow-2xl disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-5 h-5 text-gray-900 dark:text-white ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Period Selector */}
          <div className="flex gap-2 backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-2 border border-gray-200/50 dark:border-gray-800/50 shadow-lg w-fit">
            {(['day', 'week', 'month', 'year'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                  period === p
                    ? 'bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black shadow-lg scale-105'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-white/50 dark:hover:bg-black/50 hover:scale-105'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="backdrop-blur-xl bg-red-50/80 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50 rounded-2xl p-4 mb-6 shadow-lg">
            <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && !summary && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <ArrowPathIcon className="w-12 h-12 animate-spin text-gray-900 dark:text-white mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Loading analytics...</p>
            </div>
          </div>
        )}

        {/* Analytics Content */}
        {summary && (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Requests */}
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                    <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">
                  Total Requests
                </h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {formatNumber(summary.total_requests)}
                </p>
              </div>

              {/* Total Tokens */}
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                    <CpuChipIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">
                  Total Tokens
                </h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {formatNumber(summary.total_tokens)}
                </p>
              </div>

              {/* Avg Response Time */}
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                    <ClockIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">
                  Avg Response Time
                </h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {formatDuration(summary.avg_response_time)}
                </p>
              </div>

              {/* Total Sessions */}
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg hover:shadow-2xl hover:scale-105 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl shadow-md">
                    <ChartBarIcon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <h3 className="text-gray-600 dark:text-gray-400 text-sm font-semibold mb-1">
                  Total Sessions
                </h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {formatNumber(summary.total_sessions)}
                </p>
              </div>
            </div>

            {/* Most Used Model */}
            {summary.most_used_model && (
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Most Used Model
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      {summary.most_used_model.model_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                      {summary.most_used_model.model_id}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                      {formatNumber(summary.most_used_model.request_count)}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-semibold">
                      requests
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Tokens Used</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatNumber(summary.most_used_model.total_tokens)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Avg Response</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatDuration(summary.most_used_model.avg_response_time)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Model Breakdown */}
            {summary.model_breakdown && summary.model_breakdown.length > 0 && (
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Model Usage Breakdown
                </h2>
                <div className="space-y-4">
                  {summary.model_breakdown.slice(0, 10).map((model, index) => {
                    const maxCount = summary.model_breakdown[0].request_count;
                    const percentage = (model.request_count / maxCount) * 100;
                    
                    return (
                      <div key={model.model_id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500 dark:text-gray-400 font-mono font-bold">
                              #{index + 1}
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {model.model_name}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900 dark:text-white">
                            {formatNumber(model.request_count)} requests
                          </span>
                        </div>
                        <div className="relative h-2 bg-gray-200/50 dark:bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 font-medium">
                          <span>{formatNumber(model.total_tokens)} tokens</span>
                          <span>{formatDuration(model.avg_response_time)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Token Trends */}
            {summary.token_trends && summary.token_trends.length > 0 && (
              <div className="backdrop-blur-xl bg-white/80 dark:bg-black/80 rounded-2xl p-6 border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                  Token Usage Trends
                </h2>
                <div className="space-y-3">
                  {summary.token_trends.slice(0, 7).map((trend, index) => (
                    <div key={trend.date} className="flex items-center justify-between p-3 backdrop-blur-sm bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200/30 dark:border-gray-800/30 hover:scale-105 transition-transform">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {new Date(trend.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: period === 'year' ? 'numeric' : undefined
                        })}
                      </span>
                      <span className="text-lg font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        {formatNumber(trend.total_tokens)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

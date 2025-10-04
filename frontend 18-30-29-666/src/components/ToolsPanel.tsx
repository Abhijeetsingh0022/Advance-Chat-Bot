'use client';

import { useState } from 'react';
import { 
  WrenchScrewdriverIcon,
  CalculatorIcon,
  CloudIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface ToolResult {
  name: string;
  arguments: string;
  result: any;
}

interface ToolsPanelProps {
  toolResults?: ToolResult[];
  isExpanded?: boolean;
}

const TOOL_ICONS: Record<string, any> = {
  calculator: CalculatorIcon,
  weather: CloudIcon,
  search: MagnifyingGlassIcon,
  time: ClockIcon,
};

const TOOL_COLORS: Record<string, string> = {
  calculator: 'from-blue-500 to-cyan-500',
  weather: 'from-sky-500 to-blue-500',
  search: 'from-purple-500 to-pink-500',
  time: 'from-green-500 to-emerald-500',
};

const TOOL_NAMES: Record<string, string> = {
  calculator: 'Calculator',
  weather: 'Weather',
  search: 'Search',
  time: 'Time',
};

export default function ToolsPanel({ toolResults = [], isExpanded = false }: ToolsPanelProps) {
  const [expanded, setExpanded] = useState(isExpanded);

  if (!toolResults || toolResults.length === 0) {
    return null;
  }

  const formatArguments = (args: string): any => {
    try {
      return JSON.parse(args);
    } catch {
      return args;
    }
  };

  const formatResult = (result: any): string => {
    if (typeof result === 'object') {
      if (result.success === false) {
        return result.error || 'Error occurred';
      }
      if (result.result) {
        if (typeof result.result === 'object') {
          return JSON.stringify(result.result, null, 2);
        }
        return String(result.result);
      }
      return JSON.stringify(result, null, 2);
    }
    return String(result);
  };

  const isSuccess = (result: any): boolean => {
    if (typeof result === 'object' && result.success !== undefined) {
      return result.success === true;
    }
    return true;
  };

  return (
    <div className="my-4">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 border border-purple-500/20 rounded-xl transition-all mb-2"
      >
        <div className="flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-purple-500" />
          <span className="font-medium text-gray-900 dark:text-white">
            AI Tools Used ({toolResults.length})
          </span>
        </div>
        {expanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </button>

      {/* Tool Results */}
      {expanded && (
        <div className="space-y-3">
          {toolResults.map((tool, index) => {
            const Icon = TOOL_ICONS[tool.name] || WrenchScrewdriverIcon;
            const colorGradient = TOOL_COLORS[tool.name] || 'from-gray-500 to-gray-600';
            const toolName = TOOL_NAMES[tool.name] || tool.name;
            const args = formatArguments(tool.arguments);
            const resultText = formatResult(tool.result);
            const success = isSuccess(tool.result);

            return (
              <div
                key={index}
                className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden shadow-lg hover:shadow-xl transition-all"
              >
                {/* Tool Header */}
                <div className={`flex items-center gap-3 p-4 bg-gradient-to-r ${colorGradient} bg-opacity-10`}>
                  <div className={`p-2 bg-gradient-to-r ${colorGradient} rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {toolName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Tool Execution #{index + 1}
                    </p>
                  </div>
                  {success ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-red-500" />
                  )}
                </div>

                {/* Tool Content */}
                <div className="p-4 space-y-3">
                  {/* Input Arguments */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Input
                      </span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                      {typeof args === 'object' ? (
                        <div className="space-y-1 text-sm">
                          {Object.entries(args).map(([key, value]) => (
                            <div key={key} className="flex gap-2">
                              <span className="font-medium text-gray-600 dark:text-gray-400">
                                {key}:
                              </span>
                              <span className="text-gray-900 dark:text-white font-mono">
                                {String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <code className="text-sm text-gray-900 dark:text-white font-mono">
                          {args}
                        </code>
                      )}
                    </div>
                  </div>

                  {/* Output Result */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {success ? 'Output' : 'Error'}
                      </span>
                    </div>
                    <div className={`rounded-lg p-3 border ${
                      success 
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                        : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    }`}>
                      <pre className={`text-sm font-mono whitespace-pre-wrap break-words ${
                        success 
                          ? 'text-green-900 dark:text-green-300' 
                          : 'text-red-900 dark:text-red-300'
                      }`}>
                        {resultText}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Summary (when collapsed) */}
      {!expanded && (
        <div className="flex flex-wrap gap-2 mt-2">
          {toolResults.map((tool, index) => {
            const Icon = TOOL_ICONS[tool.name] || WrenchScrewdriverIcon;
            const colorGradient = TOOL_COLORS[tool.name] || 'from-gray-500 to-gray-600';
            const toolName = TOOL_NAMES[tool.name] || tool.name;
            const success = isSuccess(tool.result);

            return (
              <div
                key={index}
                className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${colorGradient} bg-opacity-10 border border-opacity-20 rounded-lg`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{toolName}</span>
                {success ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-red-500" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Compact variant for inline display
export function ToolsBadge({ toolResults = [] }: ToolsPanelProps) {
  if (!toolResults || toolResults.length === 0) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-xs font-medium text-purple-700 dark:text-purple-300">
      <SparklesIcon className="w-3.5 h-3.5" />
      <span>{toolResults.length} {toolResults.length === 1 ? 'tool' : 'tools'} used</span>
      <span className="text-purple-500">•</span>
      <span className="font-semibold">
        {toolResults.map(t => TOOL_NAMES[t.name] || t.name).join(', ')}
      </span>
    </div>
  );
}

// Available tools display (shows what tools are available)
export function AvailableToolsDisplay() {
  const tools = [
    {
      name: 'calculator',
      title: 'Calculator',
      description: 'Perform mathematical calculations',
      icon: CalculatorIcon,
      color: 'from-blue-500 to-cyan-500',
      examples: ['sqrt(144)', '15% of 250', 'sin(45)']
    },
    {
      name: 'weather',
      title: 'Weather',
      description: 'Get current weather for any location',
      icon: CloudIcon,
      color: 'from-sky-500 to-blue-500',
      examples: ['Tokyo', 'New York', 'London']
    },
    {
      name: 'search',
      title: 'Search',
      description: 'Search the web for information',
      icon: MagnifyingGlassIcon,
      color: 'from-purple-500 to-pink-500',
      examples: ['Python tutorials', 'AI news', 'React hooks']
    },
    {
      name: 'time',
      title: 'Time',
      description: 'Get current time in any timezone',
      icon: ClockIcon,
      color: 'from-green-500 to-emerald-500',
      examples: ['America/New_York', 'Asia/Tokyo', 'Europe/London']
    }
  ];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 shadow-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
          <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Available AI Tools
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            The AI can automatically use these tools to help you
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.name}
              className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 bg-gradient-to-r ${tool.color} rounded-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {tool.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {tool.description}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Try asking:
                </p>
                {tool.examples.map((example, i) => (
                  <div
                    key={i}
                    className="text-xs font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700"
                  >
                    "{example}"
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-300">
          <strong>💡 Tip:</strong> Just ask naturally! The AI will automatically detect when to use tools.
          Works with GPT-4, GPT-3.5-turbo, and Claude models.
        </p>
      </div>
    </div>
  );
}

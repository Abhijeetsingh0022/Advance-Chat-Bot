/**
 * ToolsPanel Component
 * Displays available tools/functions for the AI
 */

'use client';

import React, { useState } from 'react';
import { ToolResult } from '@/types/chat';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon?: string;
  enabled: boolean;
}

interface ToolsPanelProps {
  // When showing available tools with toggles
  tools?: Tool[];
  onToolToggle?: (toolId: string, enabled: boolean) => void;
  compact?: boolean;

  // When showing results from a specific message's tool calls
  toolResults?: ToolResult[];
  // allow parent to control expanded state for read-only results view
  isExpanded?: boolean;
}

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  tools,
  onToolToggle,
  compact = false,
  toolResults,
  isExpanded: controlledExpanded,
}) => {
  const [isExpanded, setIsExpanded] = useState(
    controlledExpanded !== undefined ? controlledExpanded : !compact
  );
  const enabledCount = tools ? tools.filter((t) => t.enabled).length : 0;

  // If toolResults is provided, render a read-only results panel
  if (toolResults && toolResults.length > 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Tool Results</h3>
        <div className="space-y-3 text-sm text-gray-800 dark:text-gray-200">
          {toolResults.map((tr, idx) => (
            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="font-medium text-gray-900 dark:text-white">{tr.tool_name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Input: {JSON.stringify(tr.input)}</div>
              <div className="mt-2 whitespace-pre-wrap text-sm">{typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output, null, 2)}</div>
              {tr.error && (
                <div className="mt-2 text-xs text-red-500">Error: {tr.error}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="font-semibold text-gray-900 dark:text-white">
            Tools ({enabledCount}/{tools ? tools.length : 0})
          </span>
          <ChevronDownIcon
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
            {tools && tools.map((tool) => (
              <label
                key={tool.id}
                className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={tool.enabled}
                  onChange={(e) => onToolToggle?.(tool.id, e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {tool.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {tool.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
        Available Tools ({enabledCount}/{tools ? tools.length : 0})
      </h3>
      <div className="space-y-2">
  {tools && tools.map((tool) => (
          <label
            key={tool.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <input
              type="checkbox"
              checked={tool.enabled}
              onChange={(e) => onToolToggle?.(tool.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {tool.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {tool.description}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

export default ToolsPanel;

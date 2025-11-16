/**
 * CodeBlock Component
 * Syntax-highlighted code display with copy button
 */

'use client';

import React, { useState } from 'react';
import { CheckIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface CodeBlockProps {
  language?: string;
  code: string;
  filename?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  language = 'javascript',
  code,
  filename,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple syntax highlighting (you can integrate Prism.js for better highlighting)
  const highlightCode = (code: string, language: string) => {
    // Basic highlighting - in production use Prism.js or Highlight.js
    return code;
  };

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-900 dark:bg-gray-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 uppercase">
            {filename || language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          title="Copy code"
        >
          {copied ? (
            <CheckIcon className="w-4 h-4 text-green-500" />
          ) : (
            <DocumentDuplicateIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Code */}
      <pre className="px-4 py-3 overflow-x-auto">
        <code className={`language-${language} text-sm text-gray-100 font-mono`}>
          {highlightCode(code, language)}
        </code>
      </pre>
    </div>
  );
};

export default CodeBlock;

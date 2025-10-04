'use client';

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { useSettingsStore } from '@/store';

interface CodeBlockProps {
  language: string;
  value: string;
  inline?: boolean;
}

export default function CodeBlock({ language, value, inline }: CodeBlockProps) {
  const { theme } = useSettingsStore();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  if (inline) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-sm font-mono text-red-600 dark:text-red-400">
        {value}
      </code>
    );
  }

  // Detect language if not specified
  const detectedLanguage = language || detectLanguage(value);

  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-gray-200/50 dark:border-gray-800/50 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
          {detectedLanguage}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg backdrop-blur-xl bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 transition-all text-gray-700 dark:text-gray-300 hover:scale-105"
          title="Copy code"
        >
          {copied ? (
            <>
              <ClipboardDocumentCheckIcon className="w-4 h-4 text-green-500" />
              <span className="text-xs font-semibold text-green-500">Copied!</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="w-4 h-4" />
              <span className="text-xs font-semibold">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <SyntaxHighlighter
        language={detectedLanguage}
        style={theme === 'dark' ? oneDark : oneLight}
        showLineNumbers
        wrapLines
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: theme === 'dark' ? '#1a1a1a' : '#ffffff',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}
        lineNumberStyle={{
          minWidth: '3em',
          paddingRight: '1em',
          color: theme === 'dark' ? '#4a5568' : '#a0aec0',
          userSelect: 'none',
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

// Simple language detection based on common patterns
function detectLanguage(code: string): string {
  const trimmedCode = code.trim();

  // Python
  if (/^(def|class|import|from|if __name__|print\()/m.test(trimmedCode)) {
    return 'python';
  }

  // JavaScript/TypeScript
  if (/^(const|let|var|function|class|import|export|interface|type)\s/m.test(trimmedCode) || 
      /=>\s*{/.test(trimmedCode)) {
    if (/:\s*(string|number|boolean|any|void|never)/.test(trimmedCode)) {
      return 'typescript';
    }
    return 'javascript';
  }

  // Java
  if (/^(public|private|protected)\s+(class|interface|enum)/m.test(trimmedCode) ||
      /System\.out\.println/.test(trimmedCode)) {
    return 'java';
  }

  // C/C++
  if (/#include\s*</.test(trimmedCode) || /int main\(/.test(trimmedCode)) {
    if (/std::|iostream|vector/.test(trimmedCode)) {
      return 'cpp';
    }
    return 'c';
  }

  // Go
  if (/^package\s+\w+/m.test(trimmedCode) || /func\s+\w+\(/.test(trimmedCode)) {
    return 'go';
  }

  // Rust
  if (/fn\s+\w+\(/.test(trimmedCode) || /let\s+mut\s/.test(trimmedCode)) {
    return 'rust';
  }

  // Ruby
  if (/^(def|class|module|require|puts)\s/m.test(trimmedCode) || /\.each\s+do/.test(trimmedCode)) {
    return 'ruby';
  }

  // PHP
  if (/^<\?php/.test(trimmedCode) || /\$\w+\s*=/.test(trimmedCode)) {
    return 'php';
  }

  // SQL
  if (/^(SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER)\s/mi.test(trimmedCode)) {
    return 'sql';
  }

  // HTML
  if (/<\/?[a-z][\s\S]*>/i.test(trimmedCode)) {
    return 'html';
  }

  // CSS
  if (/{\s*[\w-]+\s*:\s*.+;\s*}/.test(trimmedCode)) {
    return 'css';
  }

  // JSON
  if (/^[\{\[]/.test(trimmedCode) && /[\}\]]$/.test(trimmedCode)) {
    try {
      JSON.parse(trimmedCode);
      return 'json';
    } catch (e) {
      // Not valid JSON
    }
  }

  // Bash/Shell
  if (/^#!\/bin\/(bash|sh)/m.test(trimmedCode) || /^\$\s/.test(trimmedCode)) {
    return 'bash';
  }

  // Default
  return 'plaintext';
}

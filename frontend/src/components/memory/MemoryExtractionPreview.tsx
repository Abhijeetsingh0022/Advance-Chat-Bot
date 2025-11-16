/**
 * MemoryExtractionPreview Component
 * Modern memory extraction preview with black & white theme
 */

'use client';

import React, { useState } from 'react';
import {
  CheckCircleIcon,
  XMarkIcon,
  PencilSquareIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface ExtractedMemory {
  content: string;
  memory_type: string;
  category?: string;
  importance_score: number;
  confidence_score: number;
}

interface MemoryExtractionPreviewProps {
  memories: ExtractedMemory[];
  onKeep: (memory: ExtractedMemory) => void;
  onEdit: (originalMemory: ExtractedMemory, editedContent: string) => void;
  onDiscard: (memory: ExtractedMemory) => void;
  onDismiss: () => void;
}

const MemoryExtractionPreview: React.FC<MemoryExtractionPreviewProps> = ({
  memories,
  onKeep,
  onEdit,
  onDiscard,
  onDismiss,
}) => {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [visibleMemories, setVisibleMemories] = useState(memories);

  const handleKeep = (memory: ExtractedMemory, index: number) => {
    onKeep(memory);
    setVisibleMemories((prev) => prev.filter((_, i) => i !== index));
    toast.success('Memory saved');
  };

  const handleDiscard = (memory: ExtractedMemory, index: number) => {
    onDiscard(memory);
    setVisibleMemories((prev) => prev.filter((_, i) => i !== index));
    toast.success('Memory discarded');
  };

  const handleEdit = (memory: ExtractedMemory, index: number) => {
    setEditingIndex(index);
    setEditedContent(memory.content);
  };

  const handleSaveEdit = (memory: ExtractedMemory, index: number) => {
    if (editedContent.trim()) {
      onEdit(memory, editedContent);
      setVisibleMemories((prev) => prev.filter((_, i) => i !== index));
      setEditingIndex(null);
      toast.success('Memory updated and saved');
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditedContent('');
  };

  if (visibleMemories.length === 0) {
    onDismiss();
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] animate-slide-in-right">
      <div className="rounded-xl border-2 border-black bg-white shadow-2xl dark:border-white dark:bg-black">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black bg-black p-4 text-white dark:border-white dark:bg-white dark:text-black">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5" />
            <h3 className="font-semibold">
              New Memories ({visibleMemories.length})
            </h3>
          </div>
          <button
            onClick={onDismiss}
            className="rounded-lg p-1 transition-colors hover:bg-white/20 dark:hover:bg-black/20"
            title="Dismiss all"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Memory List */}
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {visibleMemories.map((memory, index) => (
            <div
              key={index}
              className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              {/* Memory Type & Scores */}
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-semibold uppercase text-gray-700 dark:border-gray-800 dark:bg-black dark:text-gray-300">
                  {memory.memory_type}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    Confidence:
                  </span>
                  <span className="font-bold text-black dark:text-white">
                    {Math.round(memory.confidence_score * 100)}%
                  </span>
                </div>
              </div>

              {/* Memory Content */}
              {editingIndex === index ? (
                <div className="space-y-2">
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full resize-none rounded-lg border-2 border-gray-200 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:border-gray-800 dark:bg-black dark:text-white dark:focus:border-white dark:focus:ring-white/10"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(memory, index)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-black px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-black transition-colors hover:border-black dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-3 text-sm text-gray-800 dark:text-gray-200">
                    {memory.content}
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleKeep(memory, index)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-black transition-all hover:border-black dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Keep
                    </button>
                    <button
                      onClick={() => handleEdit(memory, index)}
                      className="flex items-center justify-center gap-1 rounded-lg border-2 border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-black transition-all hover:border-black dark:border-gray-800 dark:bg-black dark:text-white dark:hover:border-white"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDiscard(memory, index)}
                      className="flex items-center justify-center gap-1 rounded-lg border-2 border-red-500 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 border-t-2 border-gray-200 p-4 dark:border-gray-800">
          <button
            onClick={() => {
              visibleMemories.forEach((memory) => onKeep(memory));
              setVisibleMemories([]);
              toast.success('All memories saved');
            }}
            className="flex-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            Keep All
          </button>
          <button
            onClick={() => {
              visibleMemories.forEach((memory) => onDiscard(memory));
              setVisibleMemories([]);
              toast.success('All memories discarded');
            }}
            className="flex-1 rounded-lg border-2 border-red-500 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 dark:bg-black dark:text-red-400 dark:hover:bg-red-950/20"
          >
            Discard All
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryExtractionPreview;

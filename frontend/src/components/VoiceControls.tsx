/**
 * VoiceControls Component
 * Voice input and speech-to-text functionality
 */

'use client';

import React, { useState, useRef } from 'react';
import { MicrophoneIcon, StopIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface VoiceControlsProps {
  onVoiceResult: (transcript: string) => void;
  disabled?: boolean;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  onVoiceResult,
  disabled = false,
}) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    // Check browser support
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in your browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.language = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      toast.loading('Listening...', { duration: 1000 });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        onVoiceResult(finalTranscript.trim());
        toast.success('Voice input received', { duration: 1000 });
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      toast.error(`Voice error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  return (
    <button
      onClick={isListening ? stopListening : startListening}
      disabled={disabled}
      className={`flex-shrink-0 p-2 rounded-xl transition-all ${
        isListening
          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label={isListening ? 'Stop recording' : 'Start recording'}
      title={isListening ? 'Recording... (click to stop)' : 'Voice input'}
    >
      {isListening ? (
        <StopIcon className="w-5 h-5 animate-pulse" />
      ) : (
        <MicrophoneIcon className="w-5 h-5" />
      )}
    </button>
  );
};

'use client';

import { useState, useEffect, useRef } from 'react';
import { MicrophoneIcon, StopIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface VoiceControlsProps {
  onTranscript: (text: string) => void;
  isSpeaking?: boolean;
  onToggleSpeech?: () => void;
}

export default function VoiceControls({ onTranscript, isSpeaking, onToggleSpeech }: VoiceControlsProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setIsSupported(true);
      
      // Initialize recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');

        // Only send final result
        if (event.results[0].isFinal) {
          onTranscript(transcript);
          setIsRecording(false);
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        if (event.error === 'not-allowed') {
          toast.error('Microphone access denied. Please allow microphone access.');
        } else if (event.error === 'no-speech') {
          toast.error('No speech detected. Please try again.');
        } else {
          toast.error('Voice recognition error. Please try again.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const startRecording = () => {
    if (!isSupported) {
      toast.error('Voice input is not supported in your browser');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsRecording(true);
      toast.success('Listening... Speak now');
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast.error('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Voice Input */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!isSupported}
        className={`p-2 rounded-xl backdrop-blur-xl transition-all shadow-lg ${
          isRecording
            ? 'bg-red-500 text-white animate-pulse scale-110'
            : isSupported
            ? 'bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 text-gray-700 dark:text-gray-300 hover:scale-110'
            : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
        }`}
        title={isRecording ? 'Stop recording' : 'Start voice input'}
      >
        {isRecording ? (
          <StopIcon className="w-5 h-5" />
        ) : (
          <MicrophoneIcon className="w-5 h-5" />
        )}
      </button>

      {/* Text-to-Speech Toggle */}
      {onToggleSpeech && (
        <button
          onClick={onToggleSpeech}
          className={`p-2 rounded-xl backdrop-blur-xl transition-all shadow-lg hover:scale-110 ${
            isSpeaking
              ? 'bg-green-500 text-white'
              : 'bg-white/50 dark:bg-black/50 hover:bg-white/70 dark:hover:bg-black/70 text-gray-700 dark:text-gray-300'
          }`}
          title={isSpeaking ? 'Disable text-to-speech' : 'Enable text-to-speech'}
        >
          {isSpeaking ? (
            <SpeakerWaveIcon className="w-5 h-5" />
          ) : (
            <SpeakerXMarkIcon className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-red-500/20 border border-red-500/30">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">Recording...</span>
        </div>
      )}
    </div>
  );
}

// Text-to-Speech utility function
export const speakText = (text: string, options?: { rate?: number; pitch?: number; volume?: number }) => {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    console.warn('Text-to-speech is not supported in this browser');
    return;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options?.rate || 1.0;
  utterance.pitch = options?.pitch || 1.0;
  utterance.volume = options?.volume || 1.0;

  // Get available voices and prefer English
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(voice => voice.lang.startsWith('en'));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
};

export const stopSpeaking = () => {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
};

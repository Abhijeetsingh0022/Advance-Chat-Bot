'use client';

import React from 'react';
import {
  SparklesIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  PaperClipIcon,
  PaintBrushIcon,
  MicrophoneIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  ShareIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Feature {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const features: Feature[] = [
  {
    title: 'Real-time Streaming',
    description: 'See AI responses as they\'re being generated token by token for immediate feedback',
    icon: <SparklesIcon className="w-6 h-6" />,
  },
  {
    title: 'Smart Memory',
    description: 'AI remembers context across conversations for more intelligent and relevant responses',
    icon: <BoltIcon className="w-6 h-6" />,
  },
  {
    title: 'Conversation Branching',
    description: 'Create branches from any point to explore different conversation paths effortlessly',
    icon: <ArrowPathIcon className="w-6 h-6" />,
  },
  {
    title: 'File Attachments',
    description: 'Upload images, PDFs, and documents for AI analysis and instant discussion',
    icon: <PaperClipIcon className="w-6 h-6" />,
  },
  {
    title: 'Theme Customization',
    description: 'Personalize your interface with custom themes and color schemes',
    icon: <PaintBrushIcon className="w-6 h-6" />,
  },
  {
    title: 'Voice Input',
    description: 'Speak your messages using advanced speech-to-text technology',
    icon: <MicrophoneIcon className="w-6 h-6" />,
  },
];

export default function Features() {
  return (
    <section className="relative bg-black/30 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Powerful Features
          </h2>
          <p className="text-lg text-white/80">
            Everything you need for advanced AI conversations
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border-2 border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:shadow-xl"
            >
              <div className="mb-4 w-fit rounded-xl bg-white/10 p-3 transition-all group-hover:bg-white/20 group-hover:shadow-lg">
                <div className="text-white transition-colors group-hover:scale-110 group-hover:transform">
                  {feature.icon}
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/70">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import {
  CheckBadgeIcon,
  RocketLaunchIcon,
  CpuChipIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';

interface Model {
  name: string;
  provider: string;
  type: string;
  icon: React.ReactNode;
  description: string;
}

const models: Model[] = [
  {
    name: 'GPT-4 Turbo',
    provider: 'OpenAI',
    type: 'General Purpose',
    icon: <RocketLaunchIcon className="w-5 h-5" />,
    description: 'Most capable general-purpose model',
  },
  {
    name: 'Claude 3 Opus',
    provider: 'Anthropic',
    type: 'Reasoning',
    icon: <CpuChipIcon className="w-5 h-5" />,
    description: 'Superior reasoning and analysis',
  },
  {
    name: 'Llama 3.1 405B',
    provider: 'Meta',
    type: 'General Purpose',
    icon: <BoltIcon className="w-5 h-5" />,
    description: 'High-performance open source',
  },
  {
    name: 'DeepSeek V3',
    provider: 'DeepSeek',
    type: 'Reasoning',
    icon: <CheckBadgeIcon className="w-5 h-5" />,
    description: 'Advanced math and coding',
  },
];

export default function Models() {
  return (
    <section className="relative bg-gradient-to-b from-black/20 to-black/40 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Supported AI Models
          </h2>
          <p className="text-lg text-white/80">
            Choose from 100+ state-of-the-art models
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {models.map((model, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border-2 border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:shadow-xl"
            >
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg bg-white/10 p-2 transition-all group-hover:bg-white/20 group-hover:shadow-lg">
                  <div className="text-white transition-transform group-hover:scale-110">{model.icon}</div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-white">
                    {model.name}
                  </h3>
                  <p className="mt-1 text-xs text-white/60">
                    {model.provider}
                  </p>
                </div>
              </div>
              <p className="mb-4 text-sm text-white/70">
                {model.description}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white transition-all group-hover:border-white/40 group-hover:bg-white/20">
                <CheckBadgeIcon className="h-3 w-3" />
                {model.type}
              </span>
            </div>
          ))}
        </div>

        {/* View All Models CTA */}
        <div className="mt-16 text-center">
          <p className="mb-4 text-white/80">
            Explore all available models
          </p>
          <a
            href="#models"
            className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20 hover:shadow-lg"
          >
            View All 100+ Models
          </a>
        </div>
      </div>
    </section>
  );
}

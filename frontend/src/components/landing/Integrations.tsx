'use client';

import React from 'react';
import {
  RocketLaunchIcon,
  CubeIcon,
  CodeBracketIcon,
  SparklesIcon,
  CreditCardIcon,
  BoltIcon,
  GlobeAltIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface Integration {
  name: string;
  icon: React.ReactNode;
  category: string;
}

const integrations: Integration[] = [
  { 
    name: 'OpenAI', 
    icon: <SparklesIcon className="w-8 h-8" />, 
    category: 'AI Models' 
  },
  { 
    name: 'Anthropic', 
    icon: <RocketLaunchIcon className="w-8 h-8" />, 
    category: 'AI Models' 
  },
  { 
    name: 'Google', 
    icon: <GlobeAltIcon className="w-8 h-8" />, 
    category: 'AI Models' 
  },
  { 
    name: 'GitHub', 
    icon: <CodeBracketIcon className="w-8 h-8" />, 
    category: 'Development' 
  },
  { 
    name: 'Slack', 
    icon: <BoltIcon className="w-8 h-8" />, 
    category: 'Communication' 
  },
  { 
    name: 'Stripe', 
    icon: <CreditCardIcon className="w-8 h-8" />, 
    category: 'Payments' 
  },
  { 
    name: 'Zapier', 
    icon: <CubeIcon className="w-8 h-8" />, 
    category: 'Automation' 
  },
  { 
    name: 'More Apps', 
    icon: <ArrowTopRightOnSquareIcon className="w-8 h-8" />, 
    category: 'Browse' 
  },
];

export default function Integrations() {
  return (
    <section className="relative bg-black/30 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Integrations You Love
          </h2>
          <p className="text-lg text-white/80">
            Connect with 1000+ apps and services
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {integrations.map((integration, idx) => (
            <div
              key={idx}
              className="group flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-white/10 bg-white/5 p-4 backdrop-blur-md transition-all hover:scale-110 hover:border-white/30 hover:bg-white/10 hover:shadow-xl"
            >
              <div className="text-white transition-all group-hover:scale-110">
                {integration.icon}
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-white">
                  {integration.name}
                </p>
                <p className="text-xs text-white/60">{integration.category}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="mb-4 text-white/80">
            Don&apos;t see your favorite tool?
          </p>
          <button className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black transition-all hover:scale-105 hover:shadow-lg hover:shadow-white/20">
            Request Integration
          </button>
        </div>
      </div>
    </section>
  );
}

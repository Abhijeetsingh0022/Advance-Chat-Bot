'use client';

import React, { useEffect, useState } from 'react';
import { UserGroupIcon, CpuChipIcon, BoltIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Stat {
  icon: React.ReactNode;
  value: string;
  label: string;
  description: string;
}

const stats: Stat[] = [
  {
    icon: <UserGroupIcon className="w-8 h-8" />,
    value: '50K+',
    label: 'Active Users',
    description: 'Growing community worldwide',
  },
  {
    icon: <CpuChipIcon className="w-8 h-8" />,
    value: '100+',
    label: 'AI Models',
    description: 'Constantly updated collection',
  },
  {
    icon: <BoltIcon className="w-8 h-8" />,
    value: '< 100ms',
    label: 'Response Time',
    description: 'Lightning-fast streamed responses',
  },
  {
    icon: <CheckCircleIcon className="w-8 h-8" />,
    value: '99.9%',
    label: 'Uptime SLA',
    description: 'Enterprise-grade reliability',
  },
];

export default function Stats() {
  const [animateNumbers, setAnimateNumbers] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimateNumbers(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative bg-black/30 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Trusted by Thousands
          </h2>
          <p className="text-lg text-white/80">
            Join our growing community of AI enthusiasts and professionals
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="group rounded-2xl border-2 border-white/10 bg-white/5 p-6 text-center backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:shadow-xl"
            >
              <div className="mb-4 flex justify-center">
                <div className="rounded-xl bg-white/10 p-3 transition-all group-hover:bg-white/20 group-hover:shadow-lg">
                  <div className="text-white transition-transform group-hover:scale-110">
                    {stat.icon}
                  </div>
                </div>
              </div>
              <div
                className={`mb-2 text-3xl font-bold text-white sm:text-4xl ${
                  animateNumbers ? 'animate-pulse' : ''
                }`}
              >
                {stat.value}
              </div>
              <h3 className="mb-1 font-semibold text-white">
                {stat.label}
              </h3>
              <p className="text-sm text-white/70">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2 text-white/80">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-sm">SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-sm">GDPR Ready</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="text-sm">99.9% Uptime</span>
          </div>
        </div>
      </div>
    </section>
  );
}

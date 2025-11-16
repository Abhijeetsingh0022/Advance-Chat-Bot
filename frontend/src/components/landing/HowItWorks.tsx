'use client';

import React from 'react';
import { 
  CheckCircleIcon, 
  ArrowRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  ChatBubbleLeftRightIcon,
  ArrowsRightLeftIcon
} from '@heroicons/react/24/outline';

const steps = [
  {
    number: '01',
    title: 'Sign Up',
    description: 'Create your account in seconds with email or social login',
    icon: SparklesIcon,
  },
  {
    number: '02',
    title: 'Choose Model',
    description: 'Select from 100+ AI models suited for your task',
    icon: RocketLaunchIcon,
  },
  {
    number: '03',
    title: 'Start Chatting',
    description: 'Begin conversations with real-time streaming responses',
    icon: ChatBubbleLeftRightIcon,
  },
  {
    number: '04',
    title: 'Branch & Explore',
    description: 'Create branches to explore multiple conversation paths',
    icon: ArrowsRightLeftIcon,
  },
];

export default function HowItWorks() {
  return (
    <section className="relative bg-gradient-to-b from-black/20 to-black/40 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
      
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            How It Works
          </h2>
          <p className="text-lg text-white/80">
            Get started in 4 simple steps
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="relative">
                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div className="absolute -right-3 top-20 hidden h-0.5 w-6 bg-gradient-to-r from-white/30 to-transparent lg:block"></div>
                )}

                <div className="group h-full rounded-2xl border-2 border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:shadow-xl">
                  <div className="mb-4 flex items-start gap-4">
                    <div className="text-4xl font-bold text-white/20 transition-colors group-hover:text-white/40">
                      {step.number}
                    </div>
                    <div className="rounded-xl bg-white/10 p-3 transition-all group-hover:bg-white/20 group-hover:shadow-lg">
                      <Icon className="h-6 w-6 text-white transition-transform group-hover:scale-110" />
                    </div>
                  </div>

                  <h3 className="mb-2 text-xl font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/70">
                    {step.description}
                  </p>

                  {idx < steps.length - 1 && (
                    <div className="mt-4 flex justify-end lg:hidden">
                      <ArrowRightIcon className="h-5 w-5 text-white/50" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center">
          <p className="mb-6 text-white/80">Ready to get started?</p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-white/30 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20 hover:shadow-lg"
          >
            Create Your Account
            <ArrowRightIcon className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
}

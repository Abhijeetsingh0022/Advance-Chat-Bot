'use client';

import React, { useState } from 'react';
import { CheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Plan {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

const plans: Plan[] = [
  {
    name: 'Starter',
    price: '$9',
    description: 'Perfect for trying out',
    features: [
      'Up to 100 messages/month',
      '5 AI models',
      'Basic memory',
      'Community support',
      '1 workspace',
    ],
  },
  {
    name: 'Pro',
    price: '$29',
    description: 'For regular users',
    isPopular: true,
    features: [
      'Unlimited messages',
      'All 100+ AI models',
      'Advanced memory management',
      'Conversation branching',
      'Priority support',
      'Custom themes',
      '5 workspaces',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For teams & organizations',
    features: [
      'Everything in Pro',
      'API access & webhooks',
      'Team management',
      'SSO & advanced security',
      'Dedicated support',
      'Custom integrations',
      'Unlimited workspaces',
    ],
  },
];

export default function PricingComparison() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <section className="relative bg-gradient-to-b from-black/20 to-black/40 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
      
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Pricing Built for Everyone
          </h2>
          <p className="mb-8 text-lg text-white/80">
            Choose the perfect plan for your needs
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 rounded-full border-2 border-white/20 bg-white/5 p-1 backdrop-blur-md">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`rounded-full px-6 py-2 font-medium transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-black shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`flex items-center gap-2 rounded-full px-6 py-2 font-medium transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-black shadow-lg'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Yearly
              <span className="text-xs font-semibold text-green-400">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`group relative rounded-2xl border-2 backdrop-blur-md transition-all duration-300 ${
                plan.isPopular
                  ? 'scale-105 border-white/40 bg-white/10 shadow-2xl md:scale-110'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black px-4 py-1 text-sm font-semibold text-white shadow-lg dark:bg-white dark:text-black">
                  <SparklesIcon className="h-4 w-4" />
                  Most Popular
                </div>
              )}

              <div className="p-8">
                <h3 className="mb-2 text-2xl font-bold text-white">
                  {plan.name}
                </h3>
                <p className="mb-6 text-sm text-white/70">{plan.description}</p>

                <div className="mb-8">
                  <span className="text-5xl font-bold text-white">
                    {plan.price}
                  </span>
                  {plan.price !== 'Custom' && (
                    <span className="ml-2 text-white/60">
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  )}
                </div>

                <button
                  className={`mb-8 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all ${
                    plan.isPopular
                      ? 'bg-white text-black shadow-lg hover:scale-105 hover:bg-gray-100 hover:shadow-2xl'
                      : 'border-2 border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20'
                  }`}
                >
                  {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
                </button>

                <div className="space-y-3">
                  {plan.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="flex items-center gap-3">
                      <CheckIcon className="h-5 w-5 flex-shrink-0 text-white" />
                      <span className="text-sm text-white/80">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ Note */}
        <div className="mt-16 text-center">
          <p className="mb-4 text-white/80">
            All plans include 14-day free trial • Cancel anytime
          </p>
          <a
            href="#faq"
            className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            Have questions? View FAQ
          </a>
        </div>
      </div>
    </section>
  );
}

'use client';

import React from 'react';
import {
  ShieldCheckIcon,
  LockClosedIcon,
  CheckBadgeIcon,
  SparklesIcon,
  CogIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

const trustItems = [
  {
    icon: ShieldCheckIcon,
    title: 'Enterprise Security',
    description: 'SOC 2 Type II certified with 256-bit encryption',
  },
  {
    icon: LockClosedIcon,
    title: 'Data Privacy',
    description: 'GDPR, CCPA, and HIPAA compliant data handling',
  },
  {
    icon: CheckBadgeIcon,
    title: '99.9% Uptime',
    description: 'Backed by 24/7 monitoring and redundancy',
  },
];

const companies = [
  { name: 'Tech Innovators', icon: SparklesIcon },
  { name: 'Cloud Systems', icon: CogIcon },
  { name: 'Data Science Co', icon: CheckBadgeIcon },
  { name: 'AI Research', icon: HeartIcon },
  { name: 'Enterprise Plus', icon: ShieldCheckIcon },
  { name: 'Global Solutions', icon: LockClosedIcon },
];

export default function Trust() {
  return (
    <section className="relative bg-gradient-to-b from-black/20 to-black/40 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-transparent" />
      
      <div className="relative mx-auto max-w-6xl">
        {/* Trust Badges */}
        <div className="mb-20 grid gap-8 md:grid-cols-3">
          {trustItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group rounded-2xl border-2 border-white/10 bg-white/5 p-8 text-center backdrop-blur-md transition-all duration-300 hover:border-white/30 hover:bg-white/10 hover:shadow-xl"
              >
                <div className="mb-4 flex justify-center">
                  <Icon className="h-12 w-12 text-white transition-transform group-hover:scale-110" />
                </div>
                <h3 className="mb-2 text-xl font-semibold text-white">
                  {item.title}
                </h3>
                <p className="text-white/70">{item.description}</p>
              </div>
            );
          })}
        </div>

        {/* Trusted By */}
        <div>
          <p className="mb-12 text-center font-semibold text-white/80">
            Trusted by leading companies
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {companies.map((company, idx) => {
              const CompanyIcon = company.icon;
              return (
                <div
                  key={idx}
                  className="group flex flex-col items-center justify-center rounded-xl border-2 border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:border-white/20 hover:bg-white/10"
                >
                  <CompanyIcon className="mb-2 h-8 w-8 text-white transition-transform group-hover:scale-110" />
                  <p className="text-center text-sm text-white/70 transition-colors group-hover:text-white">
                    {company.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Trust Indicators */}
        <div className="mt-16 rounded-2xl border-2 border-white/10 bg-white/5 p-8 backdrop-blur-md">
          <div className="grid gap-6 text-center md:grid-cols-3">
            <div>
              <div className="mb-2 text-3xl font-bold text-white">256-bit</div>
              <div className="text-sm text-white/70">Encryption Standard</div>
            </div>
            <div>
              <div className="mb-2 text-3xl font-bold text-white">24/7</div>
              <div className="text-sm text-white/70">Security Monitoring</div>
            </div>
            <div>
              <div className="mb-2 text-3xl font-bold text-white">100%</div>
              <div className="text-sm text-white/70">Data Ownership</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

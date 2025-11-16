'use client';

import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface Feature {
  name: string;
  free: boolean;
  pro: boolean;
  enterprise: boolean;
}

interface PricingTierProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  cta: {
    label: string;
    href: string;
  };
}

const PricingCard: React.FC<PricingTierProps> = ({
  name,
  price,
  description,
  features,
  isPopular = false,
  cta,
}) => {
  return (
    <div
      className={`relative rounded-3xl backdrop-blur-md border transition-all hover:scale-105 p-8 ${
        isPopular
          ? 'bg-white/20 border-white/40 shadow-2xl ring-2 ring-white/20'
          : 'bg-white/10 border-white/20 hover:bg-white/15'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-white to-gray-300 text-black px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}

      <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
      <p className="text-white/60 text-sm mb-6">{description}</p>

      <div className="mb-6">
        <span className="text-5xl font-bold text-white">{price}</span>
        {price !== 'Custom' && (
          <span className="text-white/60 ml-2">/month</span>
        )}
      </div>

      <a
        href={cta.href}
        className={`block w-full py-3 rounded-xl font-semibold text-center transition-all mb-8 ${
          isPopular
            ? 'bg-white text-black hover:shadow-2xl'
            : 'border-2 border-white text-white hover:bg-white/10'
        }`}
      >
        {cta.label}
      </a>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-white/80 uppercase">Features Include</p>
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <CheckIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <span className="text-white/80">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

interface PricingSectionProps {
  tiers: PricingTierProps[];
}

const PricingSection: React.FC<PricingSectionProps> = ({ tiers }) => {
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
      {tiers.map((tier, idx) => (
        <PricingCard key={idx} {...tier} />
      ))}
    </div>
  );
};

export { PricingSection, PricingCard };
export default PricingSection;

'use client';

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

const faqs = [
  {
    question: 'What AI models are available?',
    answer: 'We support 100+ models including GPT-4, Claude, Llama, DeepSeek, and more. You can switch between models in real-time for any conversation.',
  },
  {
    question: 'Can I upload files for analysis?',
    answer: 'Yes! You can upload images, PDFs, documents, and code files. Our AI can analyze and discuss them with you in real-time.',
  },
  {
    question: 'What is conversation branching?',
    answer: 'Branching lets you create multiple conversation paths from any point. Explore different directions without losing your original conversation.',
  },
  {
    question: 'Is my data secure?',
    answer: 'Yes, we use enterprise-grade encryption, secure API connections, and comply with GDPR, CCPA, and other data protection standards.',
  },
  {
    question: 'Can I use this for my team?',
    answer: 'Absolutely! Our Enterprise plan includes team management, SSO, custom integrations, and dedicated support for organizations.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! Start with our Starter plan free. Upgrade anytime. Pro users get a 14-day free trial with full features.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="relative bg-black/30 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />
      
      <div className="relative mx-auto max-w-3xl">
        <div className="mb-20 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-white/80">
            Everything you need to know about ChatBot
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className={`overflow-hidden rounded-xl border-2 backdrop-blur-md transition-all duration-300 ${
                openIndex === idx
                  ? 'border-white/30 bg-white/10 shadow-lg'
                  : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-white transition-all hover:text-white"
              >
                <span>{faq.question}</span>
                <ChevronDownIcon
                  className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${
                    openIndex === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openIndex === idx && (
                <div className="border-t border-white/10 bg-white/5 px-6 py-4">
                  <p className="text-sm leading-relaxed text-white/80">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-center">
          <p className="mb-4 text-white/70">Still have questions?</p>
          <a
            href="#contact"
            className="inline-block rounded-lg border-2 border-white/30 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:border-white/50 hover:bg-white/20"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}

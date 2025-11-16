'use client';

import React, { useState } from 'react';
import { EnvelopeIcon, CheckIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Thanks for subscribing!');
      setEmail('');
    } catch (error) {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative bg-black/30 px-4 py-24 backdrop-blur-md sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />
      
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-12 text-center">
          <h2 className="mb-4 text-4xl font-bold text-white drop-shadow-lg sm:text-5xl">
            Stay Updated
          </h2>
          <p className="text-lg text-white/80">
            Get the latest features, tips, and AI trends delivered to your inbox
          </p>
        </div>

        <form onSubmit={handleSubscribe} className="group relative">
          {/* Glow effect */}
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-white/20 to-white/10 opacity-0 blur-xl transition-all duration-300 group-hover:opacity-30"></div>

          {/* Form container */}
          <div className="relative flex flex-col gap-0 rounded-full border-2 border-white/20 bg-white/5 p-1.5 shadow-lg backdrop-blur-xl transition-all duration-300 hover:border-white/40 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 px-6">
              <EnvelopeIcon className="h-5 w-5 flex-shrink-0 text-white/70" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent py-4 text-sm text-white outline-none placeholder:text-white/50 focus:placeholder:text-white/30"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group mx-1.5 flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-8 py-4 font-semibold text-black transition-all hover:scale-105 hover:bg-gray-100 hover:shadow-lg disabled:opacity-50 sm:py-3"
            >
              {loading ? (
                'Subscribing...'
              ) : (
                <>
                  Subscribe
                  <PaperAirplaneIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-col gap-6 text-center sm:flex-row sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <CheckIcon className="h-5 w-5 flex-shrink-0 text-white" />
            <span className="text-sm text-white/80">No spam, unsubscribe anytime</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <CheckIcon className="h-5 w-5 flex-shrink-0 text-white" />
            <span className="text-sm text-white/80">Weekly digest of new features</span>
          </div>
        </div>
      </div>
    </section>
  );
}

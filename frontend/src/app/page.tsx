/**
 * Landing Page
 * Marketing homepage with authentication routing
 * Optimized for performance, SEO, and accessibility
 */

'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SparklesIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

import { useAuthStore } from '@/store';
import SplitText from '@/components/SplitText';
import BlurText from '@/components/BlurText';
import TrueFocus from '@/components/TrueFocus';
import ClickSpark from '@/components/ClickSpark';
import Navbar from '@/components/Navbar';
import TestimonialCarousel from '@/components/TestimonialCarousel';
import Features from '@/components/landing/Features';
import Models from '@/components/landing/Models';
import Stats from '@/components/landing/Stats';
import HowItWorks from '@/components/landing/HowItWorks';
import FAQ from '@/components/landing/FAQ';
import PricingComparison from '@/components/landing/PricingComparison';
import Integrations from '@/components/landing/Integrations';
import Trust from '@/components/landing/Trust';
import Newsletter from '@/components/landing/Newsletter';

// Lazy load heavy background component for better performance
const LiquidEther = dynamic(() => import('@/components/LiquidEther'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-3xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900" />
  ),
});

// Loading component
const LoadingScreen = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900">
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 animate-pulse items-center justify-center rounded-3xl bg-gradient-to-br from-black to-gray-700 shadow-2xl dark:from-white dark:to-gray-300">
        <SparklesIcon className="h-8 w-8 text-white dark:text-black" />
      </div>
      <p className="text-gray-600 dark:text-gray-400">Loading...</p>
    </div>
  </div>
);

// Testimonials data
const TESTIMONIALS = [
  {
    name: 'Sarah Chen',
    role: 'Product Manager',
    content:
      'This ChatBot platform has revolutionized how our team collaborates. The real-time streaming and memory features save us hours every week.',
    avatar: '👩‍💼',
    rating: 5,
  },
  {
    name: 'Alex Rodriguez',
    role: 'Software Engineer',
    content:
      'The API is incredibly well-designed and the documentation is thorough. Integration took us less than 2 hours.',
    avatar: '👨‍💻',
    rating: 5,
  },
  {
    name: 'Emma Thompson',
    role: 'Content Creator',
    content:
      'The conversation branching feature let me explore multiple creative directions at once. Absolutely game-changing for my workflow.',
    avatar: '👩‍🎨',
    rating: 5,
  },
];

// Footer links data
const FOOTER_LINKS = {
  product: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Security', href: '#security' },
  ],
  company: [
    { label: 'About', href: '#about' },
    { label: 'Blog', href: '#blog' },
    { label: 'Contact', href: '#contact' },
  ],
  legal: [
    { label: 'Privacy', href: '#privacy' },
    { label: 'Terms', href: '#terms' },
    { label: 'License', href: '#license' },
  ],
  social: [
    { label: 'Twitter', href: '#twitter' },
    { label: 'GitHub', href: '#github' },
    { label: 'Discord', href: '#discord' },
  ],
};

export default function LandingPage() {
  const router = useRouter();
  const { token } = useAuthStore();

  const [isHydrated, setIsHydrated] = useState(false);

  // Handle client-side hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!isHydrated) return;
    if (token) {
      router.replace('/chat');
    }
  }, [isHydrated, token, router]);

  const handleCtaClick = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      router.push(href);
    },
    [router]
  );

  // Show loading state during hydration
  if (!isHydrated) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-black">
      {/* Background - Fixed */}
      <div className="pointer-events-none fixed inset-0 z-0 h-screen w-screen overflow-hidden">
        <Suspense
          fallback={
            <div className="fixed inset-0 h-screen w-screen bg-black" />
          }
        >
          <LiquidEther
            colors={['#0066FF', '#00AAFF', '#0033FF', '#0099FF']}
            mouseForce={60}
            cursorSize={180}
            isViscous={false}
            viscous={30}
            iterationsViscous={32}
            iterationsPoisson={32}
            resolution={0.8}
            isBounce={false}
            autoDemo
            autoSpeed={1.2}
            autoIntensity={4.0}
            takeoverDuration={0.15}
            autoResumeDelay={1000}
            autoRampDuration={0.3}
          />
        </Suspense>
      </div>

      {/* Content Overlay */}
      <ClickSpark
        sparkColor="#00AAFF"
        sparkSize={6}
        sparkCount={8}
        sparkRadius={15}
        duration={400}
      >
        <div className="relative z-10">
          {/* Navigation */}
          <Navbar
            logo={{ src: '/assets/ABBY.svg', alt: 'ABBY Logo', href: '/' }}
            brandName="ChatBot"
            showAuthButtons
          />

          {/* Hero Section */}
          <section className="flex min-h-screen items-center px-4 pt-32 pb-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 inline-block">
                <img
                  src="/assets/ABBY.svg"
                  alt="ABBY Logo"
                  width={128}
                  height={128}
                  className="mx-auto h-32 w-32 rounded-3xl shadow-2xl"
                />
              </div>

              <SplitText
                text="Your Advanced AI Assistant"
                tag="h1"
                className="mb-6 text-6xl font-bold text-white sm:text-8xl"
                delay={50}
                duration={0.8}
                ease="power3.out"
                splitType="chars"
                from={{ opacity: 0, y: 50 }}
                to={{ opacity: 1, y: 0 }}
              />

              <BlurText
                text="Experience the next generation of conversational AI with real-time streaming, smart memory, conversation branching, and multi-modal support."
                delay={150}
                className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-white sm:text-2xl"
                direction="top"
              />

              <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
                <Link
                  href="/register"
                  onClick={handleCtaClick('/register')}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-black transition-all hover:scale-105 hover:shadow-2xl"
                  aria-label="Start using ChatBot for free"
                >
                  Start Free
                  <ArrowRightIcon className="h-5 w-5" aria-hidden="true" />
                </Link>
                <Link
                  href="/login"
                  onClick={handleCtaClick('/login')}
                  className="rounded-xl border-2 border-white px-8 py-4 font-semibold text-white transition-all hover:bg-white/20"
                  aria-label="Sign in to your account"
                >
                  Sign In
                </Link>
              </div>

              <div className="inline-block rounded-xl border border-white/30 bg-white/20 px-6 py-3 backdrop-blur-xl">
                <p className="text-sm text-white">
                  <span aria-hidden="true">✨</span> Powered by state-of-the-art
                  AI models
                </p>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <Features />

          {/* Stats Section */}
          <Stats />

          {/* Models Section */}
          <Models />

          {/* Testimonials Section */}
          <section
            className="bg-black/30 py-24 px-4 backdrop-blur-md sm:px-6 lg:px-8"
            aria-labelledby="testimonials-heading"
          >
            <div className="mx-auto max-w-6xl">
              <div className="mb-20 text-center">
                <h2
                  id="testimonials-heading"
                  className="mb-4 text-4xl font-bold text-white sm:text-5xl"
                >
                  What Users Are Saying
                </h2>
                <p className="text-lg text-white/70">
                  Real feedback from our community members
                </p>
              </div>

              <TestimonialCarousel
                testimonials={TESTIMONIALS}
                autoplay
                autoplayInterval={6000}
              />
            </div>
          </section>

          {/* How It Works Section */}
          <HowItWorks />

          {/* Pricing Section */}
          <PricingComparison />

          {/* Integrations Section */}
          <Integrations />

          {/* Trust Section */}
          <Trust />

          {/* FAQ Section */}
          <FAQ />

          {/* Newsletter Section */}
          <Newsletter />

          {/* CTA Section */}
          <section
            className="bg-black/30 py-20 px-4 backdrop-blur-md sm:px-6 lg:px-8"
            aria-labelledby="cta-heading"
          >
            <div className="mx-auto max-w-3xl text-center">
              <TrueFocus
                sentence="Ready to Chat?"
                manualMode={false}
                blurAmount={4}
                borderColor="#00AAFF"
                glowColor="rgba(0, 170, 255, 0.6)"
                animationDuration={0.6}
                pauseBetweenAnimations={2}
              />
              <p className="mt-8 mb-8 text-xl text-white">
                Join thousands of users experiencing the future of conversational
                AI.
              </p>
              <Link
                href="/register"
                onClick={handleCtaClick('/register')}
                className="inline-block rounded-xl bg-white px-8 py-4 font-semibold text-black transition-all hover:scale-105 hover:shadow-2xl"
                aria-label="Create your ChatBot account"
              >
                Create Your Account
              </Link>
            </div>
          </section>

          {/* Footer */}
          <footer
            className="border-t border-white/10 bg-black/60 backdrop-blur-xl"
            role="contentinfo"
          >
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
              <div className="mb-8 grid gap-8 md:grid-cols-4">
                {/* Product Links */}
                <div>
                  <h4 className="mb-4 font-semibold text-white">Product</h4>
                  <ul className="space-y-2 text-sm text-white/70">
                    {FOOTER_LINKS.product.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Company Links */}
                <div>
                  <h4 className="mb-4 font-semibold text-white">Company</h4>
                  <ul className="space-y-2 text-sm text-white/70">
                    {FOOTER_LINKS.company.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Legal Links */}
                <div>
                  <h4 className="mb-4 font-semibold text-white">Legal</h4>
                  <ul className="space-y-2 text-sm text-white/70">
                    {FOOTER_LINKS.legal.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Social Links */}
                <div>
                  <h4 className="mb-4 font-semibold text-white">Follow</h4>
                  <ul className="space-y-2 text-sm text-white/70">
                    {FOOTER_LINKS.social.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="transition-colors hover:text-white"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="border-t border-white/10 pt-8 text-center text-sm text-white/70">
                <p>&copy; {new Date().getFullYear()} ChatBot. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </ClickSpark>
    </div>
  );
}

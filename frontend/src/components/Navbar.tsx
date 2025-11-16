'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';

interface NavbarProps {
  logo?: {
    src: string;
    alt: string;
    href?: string;
  };
  brandName?: string;
  navLinks?: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
  showAuthButtons?: boolean;
  className?: string;
}

const Navbar: React.FC<NavbarProps> = ({
  logo = {
    src: '/assets/ABBY.svg',
    alt: 'Logo',
    href: '/',
  },
  brandName = 'ChatBot',
  navLinks = [],
  showAuthButtons = true,
  className = '',
}) => {
  const router = useRouter();
  const { token, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/');
    setMobileMenuOpen(false);
  };

  const handleNavigate = (href: string, external?: boolean) => {
    if (external) {
      window.open(href, '_blank');
    } else {
      router.push(href);
    }
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className={`fixed top-6 left-1/2 z-50 hidden w-full max-w-5xl -translate-x-1/2 px-4 md:block ${className}`}>
        <div className="rounded-full border border-white/20 bg-white/10 px-6 py-3 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-black/40">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Brand */}
            <Link
              href={logo.href || '/'}
              className="flex items-center gap-3 rounded-full px-2 py-1 transition-all hover:bg-white/5"
            >
              <div className="relative">
                <div className="absolute inset-0 animate-pulse rounded-full bg-white/20 blur-md" />
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="relative h-10 w-10 flex-shrink-0 rounded-full shadow-lg"
                />
              </div>
              <span className="whitespace-nowrap text-xl font-bold text-white">
                {brandName}
              </span>
            </Link>

            {/* Center Navigation Links */}
            {navLinks.length > 0 && (
              <>
                <div className="h-6 w-px bg-white/20" />
                <div className="flex flex-1 items-center justify-center gap-1">
                  {navLinks.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleNavigate(link.href, link.external)}
                      className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Auth Buttons */}
            <div className="flex items-center gap-2">
              {showAuthButtons && !token && (
                <>
                  <Link
                    href="/login"
                    className="rounded-full px-5 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="transform rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-lg transition-all hover:scale-105 hover:bg-gray-100 hover:shadow-white/20"
                  >
                    Get Started
                  </Link>
                </>
              )}

              {showAuthButtons && token && (
                <>
                  <Link
                    href="/chat"
                    className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Chat
                  </Link>
                  <Link
                    href="/memory"
                    className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Memories
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-full px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 md:hidden ${className}`}>
        <div className="border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <Link
              href={logo.href || '/'}
              className="flex items-center gap-2"
            >
              <img
                src={logo.src}
                alt={logo.alt}
                className="h-10 w-10 rounded-full shadow-lg"
              />
              <span className="text-lg font-bold text-white">
                {brandName}
              </span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-white transition-colors hover:bg-white/10"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 border-b border-white/10 bg-black/95 backdrop-blur-2xl">
            <div className="space-y-1 p-4">
              {/* Navigation Links */}
              {navLinks.map((link, idx) => (
                <button
                  key={idx}
                  onClick={() => handleNavigate(link.href, link.external)}
                  className="block w-full rounded-lg px-4 py-3 text-left text-white transition-colors hover:bg-white/10"
                >
                  {link.label}
                </button>
              ))}

              {/* Divider */}
              {navLinks.length > 0 && (
                <div className="my-2 h-px bg-white/10" />
              )}

              {/* Auth Buttons */}
              {showAuthButtons && !token && (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-lg px-4 py-3 text-center text-white transition-colors hover:bg-white/10"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-lg bg-white px-4 py-3 text-center font-semibold text-black transition-all hover:bg-gray-100"
                  >
                    Get Started
                  </Link>
                </>
              )}

              {showAuthButtons && token && (
                <>
                  <Link
                    href="/chat"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-lg px-4 py-3 text-white transition-colors hover:bg-white/10"
                  >
                    Chat
                  </Link>
                  <Link
                    href="/memory"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-lg px-4 py-3 text-white transition-colors hover:bg-white/10"
                  >
                    Memories
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full rounded-lg px-4 py-3 text-white transition-colors hover:bg-white/10"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block w-full rounded-lg border border-white/30 px-4 py-3 text-white transition-colors hover:bg-white/10"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;

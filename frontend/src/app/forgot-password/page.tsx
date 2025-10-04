'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { EnvelopeIcon, PaperAirplaneIcon, KeyIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
      toast.success('Password reset link sent to your email');
    } catch (error: any) {
      console.error('Forgot password error:', error);
      const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to send reset link';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 animate-fade-in">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all">
                <PaperAirplaneIcon className="w-10 h-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
              Check Your Email
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              We've sent a password reset link to
            </p>
            <p className="text-black dark:text-white font-semibold mt-1">{email}</p>
          </div>

          <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-8 shadow-2xl animate-fade-in">
            <p className="text-center text-gray-600 dark:text-gray-400 text-sm mb-6">
              Click the link in the email to reset your password. If you don't see the email, check your spam folder.
            </p>
            
            <Link href="/login" className="block w-full bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all font-semibold text-center shadow-xl hover:shadow-2xl transform">
              Back to Login
            </Link>
            
            <button
              onClick={() => setSent(false)}
              className="mt-3 w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              Try another email
            </button>
          </div>

          <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>© 2025 ChatBot. All rights reserved.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all">
              <KeyIcon className="w-10 h-10 text-white dark:text-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Forgot Password?
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        {/* Forgot Password Form */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-8 shadow-2xl animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2 text-black dark:text-white">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white placeholder-gray-400 transition-all"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl hover:shadow-2xl transform disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner border-white dark:border-black mr-2"></div>
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
            >
              ← Back to Login
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>© 2025 ChatBot. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

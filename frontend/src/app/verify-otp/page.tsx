'use client';

import { useState, FormEvent, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { ShieldCheckIcon } from '@heroicons/react/24/outline';

function VerifyOTPContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams?.get('email') || '';
  
  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newOtp = pastedData.split('');
    while (newOtp.length < 6) newOtp.push('');
    setOtp(newOtp);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');

    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    // Additional validation: ensure all characters are digits
    if (!/^\d{6}$/.test(otpCode)) {
      toast.error('OTP must contain only digits');
      return;
    }

    if (!email) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);

    try {
      await authAPI.verifyOTP({ email, otp: otpCode });
      toast.success('Email verified successfully!');
      router.push('/login');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      const message = error.response?.data?.message || error.response?.data?.detail || error.message || 'Verification failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setResending(true);

    try {
      await authAPI.resendVerification({ email, verification_method: 'otp' });
      toast.success('New OTP sent to your email');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } catch (error: any) {
      console.error('Resend error:', error);
      const message = error.response?.data?.message || error.response?.data?.detail || 'Failed to resend OTP';
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-3xl flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all">
              <ShieldCheckIcon className="w-10 h-10 text-white dark:text-black" />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Verify Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Enter the 6-digit code sent to
          </p>
          <p className="text-black dark:text-white font-semibold mt-1">{email}</p>
        </div>

        {/* Verification Form */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-8 shadow-2xl animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input (in case query param is missing or wrong) */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-2 text-black dark:text-white">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white placeholder-gray-400 transition-all"
                placeholder="Enter your email address"
                required
              />
            </div>
            {/* OTP Input */}
            <div>
              <label className="block text-sm font-semibold mb-3 text-center text-black dark:text-white">
                Enter Verification Code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-bold backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white transition-all"
                    autoComplete="off"
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl hover:shadow-2xl transform disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner border-white dark:border-black mr-2"></div>
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Didn't receive the code?
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="text-black dark:text-white hover:underline font-semibold disabled:opacity-50"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-4 text-center">
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

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900">
        <div className="spinner border-black dark:border-white"></div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}

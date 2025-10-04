'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationType, setVerificationType] = useState<'otp' | 'token'>('otp');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
    setPasswordStrength(strength);
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    calculatePasswordStrength(pwd);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register({
        email,
        password,
        verification_method: verificationType,
      });

      toast.success('Registration successful! Please check your email for verification.');
      
      if (verificationType === 'otp') {
        router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/login');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || error.response?.data?.detail || 'Registration failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 1) return 'bg-gray-400 dark:bg-gray-600';
    if (passwordStrength <= 3) return 'bg-gray-600 dark:bg-gray-400';
    return 'bg-black dark:bg-white';
  };

  const getStrengthText = () => {
    if (passwordStrength <= 1) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
            <UserPlusIcon className="w-10 h-10 text-white dark:text-black" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
            Create Account
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base">
            Start your AI-powered conversation journey
          </p>
        </div>

        {/* Register Form */}
        <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-8 animate-fade-in shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-2 text-black dark:text-white">
                Email Address
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 text-black dark:text-white placeholder-gray-400 transition-all shadow-lg focus:shadow-xl"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2 text-black dark:text-white">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 text-black dark:text-white placeholder-gray-400 transition-all shadow-lg focus:shadow-xl"
                  placeholder="At least 8 characters"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                      Password Strength
                    </span>
                    <span className={`font-bold ${
                      passwordStrength <= 1 ? 'text-gray-400' :
                      passwordStrength <= 3 ? 'text-gray-600 dark:text-gray-400' :
                      'text-black dark:text-white'
                    }`}>
                      {getStrengthText()}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200/70 dark:bg-gray-800/70 rounded-full overflow-hidden backdrop-blur-xl">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                      style={{ width: `${(passwordStrength / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2 text-black dark:text-white">
                Confirm Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 text-black dark:text-white placeholder-gray-400 transition-all shadow-lg focus:shadow-xl"
                  placeholder="Re-enter your password"
                  required
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">Passwords do not match</p>
              )}
            </div>

            {/* Verification Method */}
            <div>
              <label className="block text-sm font-bold mb-3 text-black dark:text-white">
                Verification Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVerificationType('otp')}
                  className={`p-4 rounded-2xl border backdrop-blur-xl transition-all transform hover:scale-105 shadow-lg ${
                    verificationType === 'otp'
                      ? 'border-gray-700/50 dark:border-gray-400/50 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black'
                      : 'border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-black/70 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {verificationType === 'otp' && (
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                    )}
                    <span className="font-bold">OTP Code</span>
                  </div>
                  <p className="text-xs mt-2 opacity-80">
                    6-digit code
                  </p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setVerificationType('token')}
                  className={`p-4 rounded-2xl border backdrop-blur-xl transition-all transform hover:scale-105 shadow-lg ${
                    verificationType === 'token'
                      ? 'border-gray-700/50 dark:border-gray-400/50 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black'
                      : 'border-gray-200/50 dark:border-gray-800/50 bg-white/70 dark:bg-black/70 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {verificationType === 'token' && (
                      <CheckCircleIcon className="w-5 h-5 mr-2" />
                    )}
                    <span className="font-bold">Email Link</span>
                  </div>
                  <p className="text-xs mt-2 opacity-80">
                    Click to verify
                  </p>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || password !== confirmPassword}
              className="w-full bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-4 px-6 border border-gray-700/50 dark:border-gray-400/50 rounded-2xl hover:from-gray-700 hover:to-black dark:hover:from-gray-300 dark:hover:to-white transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner border-white dark:border-black mr-2"></div>
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-black dark:text-white hover:underline font-bold"
              >
                Sign in
              </Link>
            </p>
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

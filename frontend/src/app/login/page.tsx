/**
 * Login Page
 * Premium authentication experience with black & white theme
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

import { useAuthStore } from '@/store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [touched, setTouched] = useState({ email: false, password: false });

  const validateForm = useCallback(() => {
    const nextErrors: LoginErrors = {};

    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Invalid email format';
    }

    if (!trimmedPassword) {
      nextErrors.password = 'Password is required';
    } else if (trimmedPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [email, password]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Mark all fields as touched
      setTouched({ email: true, password: true });

      if (!validateForm()) return;

      setIsLoading(true);
      setErrors({});

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/login`, {
          email: email.trim(),
          password,
        });

        const { access_token, user } = response.data ?? {};

        if (!access_token || !user) {
          throw new Error('Invalid response from server');
        }

        setToken(access_token);
        setUser({
          id: user.id,
          email: user.email,
          name: user.name || '',
        });

        const maxAgeSeconds = 7 * 24 * 60 * 60;
        document.cookie = [
          `auth-token=${access_token}`,
          'path=/',
          `max-age=${maxAgeSeconds}`,
          'SameSite=Lax',
        ].join('; ');

        toast.success(`Welcome back, ${user.name || 'User'}!`);
        router.push('/chat');
      } catch (err: unknown) {
        const axiosError = err as any;
        const message =
          axiosError?.response?.data?.detail ||
          axiosError?.response?.data?.message ||
          axiosError?.message ||
          'Login failed. Please try again.';

        setErrors((prev) => ({
          ...prev,
          form: message,
        }));

        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [email, password, validateForm, setToken, setUser, router]
  );

  const handleEmailChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(event.target.value);
      if (errors.email || errors.form) {
        setErrors((prev) => ({ ...prev, email: undefined, form: undefined }));
      }
    },
    [errors.email, errors.form]
  );

  const handlePasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
      if (errors.password || errors.form) {
        setErrors((prev) => ({
          ...prev,
          password: undefined,
          form: undefined,
        }));
      }
    },
    [errors.password, errors.form]
  );

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleBlur = useCallback((field: 'email' | 'password') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const isEmailValid = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = password.length >= 6;
  const isSubmitDisabled = isLoading || !isEmailValid || !isPasswordValid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-white px-4 py-8 dark:from-gray-950 dark:to-black">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
          >
            <HomeIcon className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-black shadow-2xl dark:bg-white">
            <SparklesIcon className="h-10 w-10 text-white dark:text-black" />
          </div>
          <h1 className="mb-3 text-4xl font-bold text-black dark:text-white">
            Welcome Back
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Sign in to continue to your workspace
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-describedby={errors.form ? 'login-form-error' : undefined}
        >
          {/* Form error */}
          {errors.form && (
            <div
              id="login-form-error"
              className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                {errors.form}
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-black dark:text-white"
            >
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                className={[
                  'w-full rounded-xl border-2 bg-white px-4 py-3.5 pl-11 pr-11 text-black placeholder-gray-400 transition-all focus:outline-none dark:bg-black dark:text-white dark:placeholder-gray-600',
                  touched.email && errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 focus:border-black focus:ring-4 focus:ring-black/5 dark:border-gray-800 dark:focus:border-white dark:focus:ring-white/5',
                ].join(' ')}
                disabled={isLoading}
                aria-invalid={!!(touched.email && errors.email)}
                aria-describedby={touched.email && errors.email ? 'email-error' : undefined}
              />
              {isEmailValid && (
                <CheckCircleIcon className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {touched.email && errors.email && (
              <p id="email-error" className="mt-2 text-sm text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-black dark:text-white"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-gray-600 transition-colors hover:text-black dark:text-gray-400 dark:hover:text-white"
              >
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 transition-colors" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                placeholder="Enter your password"
                className={[
                  'w-full rounded-xl border-2 bg-white px-4 py-3.5 pl-11 pr-11 text-black placeholder-gray-400 transition-all focus:outline-none dark:bg-black dark:text-white dark:placeholder-gray-600',
                  touched.password && errors.password
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 focus:border-black focus:ring-4 focus:ring-black/5 dark:border-gray-800 dark:focus:border-white dark:focus:ring-white/5',
                ].join(' ')}
                disabled={isLoading}
                aria-invalid={!!(touched.password && errors.password)}
                aria-describedby={touched.password && errors.password ? 'password-error' : undefined}
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-300"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </div>
            {touched.password && errors.password && (
              <p id="password-error" className="mt-2 text-sm text-red-500">
                {errors.password}
              </p>
            )}
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={[
              'group relative w-full overflow-hidden rounded-xl bg-black py-3.5 text-sm font-semibold text-white shadow-lg transition-all hover:shadow-xl dark:bg-white dark:text-black',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none',
              !isSubmitDisabled && 'hover:scale-[1.02]',
            ].join(' ')}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-black dark:border-t-transparent" />
                Signing in...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Sign In
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            New to ChatBot?
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            Create Account
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-500 dark:text-gray-600">
          <p>
            Protected by industry-standard encryption
          </p>
        </div>
      </div>
    </div>
  );
}

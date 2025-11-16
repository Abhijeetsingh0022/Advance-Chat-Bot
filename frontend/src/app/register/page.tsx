/**
 * Register Page
 * Premium account creation with black & white theme
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';

import { useAuthStore } from '@/store';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

type RegisterErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  form?: string;
};

const passwordRequirements = [
  { regex: /.{8,}/, label: 'At least 8 characters' },
  { regex: /[A-Z]/, label: 'One uppercase letter' },
  { regex: /[a-z]/, label: 'One lowercase letter' },
  { regex: /[0-9]/, label: 'One number' },
];

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });

  const passwordScore = useMemo(
    () => passwordRequirements.filter((req) => req.regex.test(password)).length,
    [password]
  );

  const getPasswordStrength = (score: number) => {
    if (score === 0) return { label: 'Weak', color: 'bg-red-500' };
    if (score <= 2) return { label: 'Fair', color: 'bg-yellow-500' };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500' };
    return { label: 'Strong', color: 'bg-green-500' };
  };

  const validateForm = useCallback(() => {
    const nextErrors: RegisterErrors = {};

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      nextErrors.name = 'Name is required';
    } else if (trimmedName.length < 2) {
      nextErrors.name = 'Name must be at least 2 characters';
    }

    if (!trimmedEmail) {
      nextErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = 'Invalid email format';
    }

    if (!password) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    } else if (passwordScore < 3) {
      nextErrors.password = 'Password is too weak';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [name, email, password, confirmPassword, passwordScore]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      // Mark all as touched
      setTouched({ name: true, email: true, password: true, confirmPassword: true });

      if (!validateForm()) return;

      setIsLoading(true);
      setErrors({});

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/register`, {
          name: name.trim(),
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

        toast.success(`Welcome, ${user.name}!`);
        router.push('/chat');
      } catch (err: unknown) {
        const axiosError = err as any;
        const apiMessage =
          axiosError?.response?.data?.detail ||
          axiosError?.response?.data?.message;
        const message = apiMessage || 'Registration failed. Please try again.';

        setErrors((prev) => ({
          ...prev,
          form: message,
        }));

        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [name, email, password, validateForm, setToken, setUser, router]
  );

  const handleBlur = useCallback((field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setName(event.target.value);
      if (errors.name || errors.form) {
        setErrors((prev) => ({ ...prev, name: undefined, form: undefined }));
      }
    },
    [errors.name, errors.form]
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

  const handleConfirmPasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(event.target.value);
      if (errors.confirmPassword || errors.form) {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: undefined,
          form: undefined,
        }));
      }
    },
    [errors.confirmPassword, errors.form]
  );

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    setShowConfirmPassword((prev) => !prev);
  }, []);

  const isNameValid = name.trim().length >= 2;
  const isEmailValid = email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isPasswordValid = passwordScore >= 3;
  const isConfirmPasswordValid = confirmPassword && password === confirmPassword;
  const isSubmitDisabled = isLoading || !isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid;

  const strength = getPasswordStrength(passwordScore);

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
            Join ChatBot
          </h1>
          <p className="text-base text-gray-600 dark:text-gray-400">
            Create your account to get started
          </p>
        </div>

        {/* Sign Up Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
          noValidate
          aria-describedby={errors.form ? 'register-form-error' : undefined}
        >
          {/* Form error */}
          {errors.form && (
            <div
              id="register-form-error"
              className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
            >
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                {errors.form}
              </div>
            </div>
          )}

          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-black dark:text-white"
            >
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="name"
                type="text"
                value={name}
                onChange={handleNameChange}
                onBlur={() => handleBlur('name')}
                placeholder="John Doe"
                autoComplete="name"
                className={[
                  'w-full rounded-xl border-2 bg-white px-4 py-3.5 pl-11 pr-11 text-black placeholder-gray-400 transition-all focus:outline-none dark:bg-black dark:text-white dark:placeholder-gray-600',
                  touched.name && errors.name
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 focus:border-black focus:ring-4 focus:ring-black/5 dark:border-gray-800 dark:focus:border-white dark:focus:ring-white/5',
                ].join(' ')}
                disabled={isLoading}
                aria-invalid={!!(touched.name && errors.name)}
                aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
              />
              {isNameValid && (
                <CheckCircleIcon className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {touched.name && errors.name && (
              <p id="name-error" className="mt-2 text-sm text-red-500">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-black dark:text-white"
            >
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                autoComplete="email"
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
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-black dark:text-white"
            >
              Password
            </label>
            <div className="relative">
              <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={handlePasswordChange}
                onBlur={() => handleBlur('password')}
                placeholder="Create a strong password"
                autoComplete="new-password"
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

            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-3 space-y-3">
                {/* Strength bar */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Password Strength</span>
                    <span className="font-medium text-black dark:text-white">{strength.label}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                    <div
                      className={`h-full transition-all ${strength.color}`}
                      style={{ width: `${(passwordScore / 4) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Requirements checklist */}
                <div className="space-y-1.5">
                  {passwordRequirements.map((req, index) => {
                    const satisfied = req.regex.test(password);
                    return (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {satisfied ? (
                          <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-700" />
                        )}
                        <span
                          className={
                            satisfied
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-gray-500 dark:text-gray-500'
                          }
                        >
                          {req.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {touched.password && errors.password && (
              <p id="password-error" className="mt-2 text-sm text-red-500">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-black dark:text-white"
            >
              Confirm Password
            </label>
            <div className="relative">
              <LockClosedIcon className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                onBlur={() => handleBlur('confirmPassword')}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                className={[
                  'w-full rounded-xl border-2 bg-white px-4 py-3.5 pl-11 pr-11 text-black placeholder-gray-400 transition-all focus:outline-none dark:bg-black dark:text-white dark:placeholder-gray-600',
                  touched.confirmPassword && errors.confirmPassword
                    ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                    : 'border-gray-200 focus:border-black focus:ring-4 focus:ring-black/5 dark:border-gray-800 dark:focus:border-white dark:focus:ring-white/5',
                ].join(' ')}
                disabled={isLoading}
                aria-invalid={!!(touched.confirmPassword && errors.confirmPassword)}
                aria-describedby={
                  touched.confirmPassword && errors.confirmPassword
                    ? 'confirm-password-error'
                    : undefined
                }
              />
              <button
                type="button"
                onClick={toggleConfirmPasswordVisibility}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-900 dark:hover:text-gray-300"
                tabIndex={-1}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
              {isConfirmPasswordValid && (
                <CheckCircleIcon className="pointer-events-none absolute right-11 top-1/2 h-5 w-5 -translate-y-1/2 text-green-500" />
              )}
            </div>
            {touched.confirmPassword && errors.confirmPassword && (
              <p id="confirm-password-error" className="mt-2 text-sm text-red-500">
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Create Account Button */}
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
                Creating Account...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Create Account
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            )}
          </button>
        </form>

        {/* Terms */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-600">
          By creating an account, you agree to our{' '}
          <Link href="#" className="text-black underline dark:text-white">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="#" className="text-black underline dark:text-white">
            Privacy Policy
          </Link>
        </p>

        {/* Sign In Link */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/50">
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Already have an account?
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl border-2 border-black bg-white px-6 py-2.5 text-sm font-semibold text-black transition-all hover:bg-black hover:text-white dark:border-white dark:bg-black dark:text-white dark:hover:bg-white dark:hover:text-black"
          >
            Sign In
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

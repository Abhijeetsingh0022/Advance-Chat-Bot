'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/store';
import toast from 'react-hot-toast';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    console.log('=== LOGIN ATTEMPT STARTED ===');
    console.log('Email:', email);
    console.log('Password:', password.length, 'characters');
    console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api');
    
    setLoading(true);

    try {
      console.log('Sending login request...');
      const response = await authAPI.login({ email, password });
      console.log('Full login response:', response);
      console.log('Login response data:', response.data);
      
      if (!response.data || !response.data.access_token) {
        throw new Error('No access token in response');
      }
      
      // Set token first - this will enable authenticated requests
      console.log('Setting token...');
      const token = response.data.access_token;
      console.log('Token to set:', token.substring(0, 20) + '...');
      
      // Save to localStorage immediately and directly
      localStorage.setItem('token', token);
      console.log('Token saved directly to localStorage');
      
      // Then update store
      setToken(token);
      console.log('Token set successfully in state');
      
      // Try to fetch user profile
      try {
        console.log('Fetching user profile...');
        const profileResponse = await authAPI.getProfile();
        console.log('User profile response:', profileResponse);
        const userData = profileResponse.data;
        console.log('User profile data:', userData);
        
        // Save user to localStorage directly
        localStorage.setItem('user', JSON.stringify(userData));
        console.log('User saved directly to localStorage');
        
        // Then update store
        setUser(userData);
        console.log('User set successfully');
      } catch (profileError: any) {
        console.error('Failed to fetch profile:', profileError);
        console.error('Profile error status:', profileError.response?.status);
        console.error('Profile error data:', profileError.response?.data);
        // Don't redirect if profile fetch fails
        toast.error('Failed to load profile. Please try again.');
        setToken(null);
        return;
      }
      
      toast.success('Welcome back!');
      console.log('About to redirect to /chat...');
      console.log('Current location:', window.location.href);
      
      // Small delay to ensure all state is persisted
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Verify everything is saved
      const verifyToken = localStorage.getItem('token');
      const verifyUser = localStorage.getItem('user');
      console.log('Verification before redirect:');
      console.log('- Token in localStorage:', verifyToken ? 'exists' : 'MISSING');
      console.log('- User in localStorage:', verifyUser ? 'exists' : 'MISSING');
      
      if (!verifyToken) {
        console.error('ERROR: Token not in localStorage before redirect!');
        toast.error('Login state not saved. Please try again.');
        return;
      }
      
      // Use router.push instead of window.location for smoother navigation
      console.log('Redirecting now...');
      router.push('/chat');
      
    } catch (error: any) {
      console.error('=== LOGIN ERROR ===');
      console.error('Error:', error);
      console.error('Response:', error.response?.data);
      console.error('Status:', error.response?.status);
      const message = error.response?.data?.message || error.response?.data?.detail || 'Login failed';
      toast.error(message);
      
      // Clear any partial state on error
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
      console.log('=== LOGIN ATTEMPT COMPLETED ===');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900 p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-transform">
            <LockClosedIcon className="w-10 h-10 text-white dark:text-black" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-3">
            Welcome Back
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-base">
            Sign in to continue your conversation
          </p>
        </div>

        {/* Login Form */}
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 text-black dark:text-white placeholder-gray-400 transition-all shadow-lg focus:shadow-xl"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
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
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-black dark:text-white hover:underline font-medium"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-4 px-6 border border-gray-700/50 dark:border-gray-400/50 rounded-2xl hover:from-gray-700 hover:to-black dark:hover:from-gray-300 dark:hover:to-white transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:hover:scale-100"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <div className="spinner border-white dark:border-black mr-2"></div>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href="/register"
                className="text-black dark:text-white hover:underline font-bold"
              >
                Sign up
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

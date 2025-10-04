/**
 * Profile Page Component
 * 
 * Comprehensive user profile management interface with:
 * - Profile information updates
 * - Password change functionality
 * - Account deletion with confirmation
 * - Form validation and error handling
 * - Loading states and user feedback
 */

'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useAuthStore } from '@/store';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { 
  UserCircleIcon, 
  EnvelopeIcon, 
  LockClosedIcon, 
  TrashIcon 
} from '@heroicons/react/24/outline';

// ============================================================================
// PROFILE PAGE COMPONENT
// ============================================================================

export default function ProfilePage() {
  // ==========================================================================
  // HOOKS AND STATE MANAGEMENT
  // ==========================================================================
  
  const { user, setUser, logout } = useAuthStore();
  
  // Form state
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ==========================================================================
  // INITIALIZATION: Sync form with user data
  // ==========================================================================
  
  useEffect(() => {
    if (user) {
      setEmail(user.email);
    }
  }, [user]);

  // ==========================================================================
  // PROFILE UPDATE HANDLER
  // ==========================================================================
  
  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // ======================================================================
      // API REQUEST: Update user profile
      // ======================================================================
      const { data } = await authAPI.updateProfile({ email });
      
      // ======================================================================
      // SUCCESS HANDLING: Update store and show feedback
      // ======================================================================
      setUser(data);
      toast.success('Profile updated successfully');
      
    } catch (error: any) {
      // ======================================================================
      // ERROR HANDLING: Log and display error message
      // ======================================================================
      console.error('Update profile error:', error);
      const message = error.response?.data?.message || 
                     error.response?.data?.detail || 
                     'Update failed';
      toast.error(message);
      
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // PASSWORD CHANGE HANDLER
  // ==========================================================================
  
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();

    // ========================================================================
    // CLIENT-SIDE VALIDATION: Password matching and strength
    // ========================================================================
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // ======================================================================
      // API REQUEST: Submit password change
      // ======================================================================
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_password', newPassword);
      
      await authAPI.changePassword(formData);
      
      // ======================================================================
      // SUCCESS HANDLING: Clear form and show feedback
      // ======================================================================
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
    } catch (error: any) {
      // ======================================================================
      // ERROR HANDLING: Display appropriate error message
      // ======================================================================
      console.error('Change password error:', error);
      const message = error.response?.data?.message || 
                     error.response?.data?.detail || 
                     'Password change failed';
      toast.error(message);
      
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // ACCOUNT DELETION HANDLER
  // ==========================================================================
  
  const handleDeleteAccount = async (e: FormEvent) => {
    e.preventDefault();

    // ========================================================================
    // CONFIRMATION DIALOG: Require user confirmation
    // ========================================================================
    if (!confirm('Are you absolutely sure? This action cannot be undone.')) {
      return;
    }

    setLoading(true);

    try {
      // ======================================================================
      // API REQUEST: Delete user account
      // ======================================================================
      const formData = new FormData();
      formData.append('password', deletePassword);
      
      await authAPI.deleteAccount(formData);
      
      // ======================================================================
      // SUCCESS HANDLING: Logout and show feedback
      // ======================================================================
      toast.success('Account deleted successfully');
      logout();
      
    } catch (error: any) {
      // ======================================================================
      // ERROR HANDLING: Display deletion error
      // ======================================================================
      console.error('Delete account error:', error);
      const message = error.response?.data?.message || 
                     error.response?.data?.detail || 
                     'Account deletion failed';
      toast.error(message);
      
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================================
  // COMPONENT RENDER
  // ==========================================================================
  
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {/* ====================================================================== */}
      {/* PAGE HEADER: Title and description */}
      {/* ====================================================================== */}
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <UserCircleIcon className="h-8 w-8 text-blue-600" />
          Profile Settings
        </h1>
        <p className="mt-2 text-gray-600">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="space-y-8">
        {/* ================================================================== */}
        {/* PROFILE UPDATE SECTION */}
        {/* ================================================================== */}
        
        <section className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <EnvelopeIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Account Information
            </h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Update your account details
          </p>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </section>

        {/* ================================================================== */}
        {/* PASSWORD CHANGE SECTION */}
        {/* ================================================================== */}
        
        <section className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <LockClosedIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Change Password
            </h2>
          </div>
          
          <p className="text-sm text-gray-600 mb-6">
            Update your password to keep your account secure
          </p>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={8}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </section>

        {/* ================================================================== */}
        {/* ACCOUNT DELETION SECTION */}
        {/* ================================================================== */}
        
        <section className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrashIcon className="h-6 w-6 text-red-600" />
            <h2 className="text-xl font-semibold text-red-900">
              Delete Account
            </h2>
          </div>
          
          <p className="text-sm text-red-700 mb-4">
            Permanently delete your account and all associated data
          </p>

          <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This action cannot be undone. All your conversations, 
              messages, and account data will be permanently deleted.
            </p>
          </div>

          <form onSubmit={handleDeleteAccount} className="space-y-4">
            <div>
              <label htmlFor="deletePassword" className="block text-sm font-medium text-red-700 mb-2">
                Enter your password to confirm deletion
              </label>
              <input
                type="password"
                id="deletePassword"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
                required
                disabled={loading}
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}

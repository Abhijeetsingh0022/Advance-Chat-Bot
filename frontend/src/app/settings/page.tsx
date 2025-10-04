'use client';

import { useState, useEffect } from 'react';
import { useAuthStore, useSettingsStore } from '@/store';
import { settingsAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  UserCircleIcon,
  PaintBrushIcon,
  ShieldCheckIcon,
  BellIcon,
  CpuChipIcon,
  ArrowDownTrayIcon,
  ComputerDesktopIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type TabType = 'profile' | 'appearance' | 'security' | 'notifications' | 'privacy' | 'ai' | 'sessions' | 'data';

export default function SettingsPage() {
  const { user, logout } = useAuthStore();
  const {
    theme,
    toggleTheme,
    glassStyle,
    setGlassStyle,
    fontSize,
    setFontSize,
    accentColor,
    setAccentColor,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    email: user?.email || '',
    full_name: '',
    bio: '',
    phone: '',
    location: '',
  });

  // Security state
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    chat_notifications: true,
    security_alerts: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profile_visibility: 'private',
    show_online_status: true,
    data_collection: true,
  });

  // AI preferences
  const [aiPrefs, setAiPrefs] = useState({
    default_model: 'gpt-oss',
    temperature: 0.7,
    max_tokens: 2000,
    stream_responses: true,
  });

  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);

  // Delete account
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      // Load profile
      const profileRes = await settingsAPI.getProfile();
      setProfile(prev => ({ ...prev, ...profileRes.data }));

      // Load settings
      const settingsRes = await settingsAPI.getSettings();
      if (settingsRes.data.notifications) {
        setNotifications(settingsRes.data.notifications);
      }
      if (settingsRes.data.privacy) {
        setPrivacy(settingsRes.data.privacy);
      }
      if (settingsRes.data.ai_preferences) {
        setAiPrefs(settingsRes.data.ai_preferences);
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await settingsAPI.getSessions();
      setSessions(res.data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      toast.error('Failed to load sessions');
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') {
      loadSessions();
    }
  }, [activeTab]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateProfile(profile);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppearance = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({
        appearance: {
          theme,
          glass_style: glassStyle,
          font_size: fontSize,
          accent_color: accentColor,
        },
      });
      toast.success('Appearance settings saved');
    } catch (error) {
      console.error('Failed to save appearance:', error);
      toast.error('Failed to save appearance settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed successfully');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({ notifications });
      toast.success('Notification settings saved');
    } catch (error) {
      console.error('Failed to save notifications:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivacy = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({ privacy });
      toast.success('Privacy settings saved');
    } catch (error) {
      console.error('Failed to save privacy:', error);
      toast.error('Failed to save privacy settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAI = async () => {
    setSaving(true);
    try {
      await settingsAPI.updateSettings({ ai_preferences: aiPrefs });
      toast.success('AI preferences saved');
    } catch (error) {
      console.error('Failed to save AI preferences:', error);
      toast.error('Failed to save AI preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await settingsAPI.revokeSession(sessionId);
      toast.success('Session revoked');
      loadSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
      toast.error('Failed to revoke session');
    }
  };

  const handleExportData = async () => {
    setSaving(true);
    try {
      const res = await settingsAPI.exportData();
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chatbot-data-${new Date().toISOString()}.json`;
      a.click();
      toast.success('Data exported successfully');
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Failed to export data');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirmDelete) {
      toast.error('Please confirm account deletion');
      return;
    }

    setSaving(true);
    try {
      await settingsAPI.deleteAccount(deletePassword);
      toast.success('Account deleted successfully');
      logout();
    } catch (error: any) {
      console.error('Failed to delete account:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete account');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserCircleIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'privacy', name: 'Privacy', icon: EyeIcon },
    { id: 'ai', name: 'AI Preferences', icon: CpuChipIcon },
    { id: 'sessions', name: 'Sessions', icon: ComputerDesktopIcon },
    { id: 'data', name: 'Data & Account', icon: ArrowDownTrayIcon },
  ];

  return (
    <div className="flex-1 overflow-hidden flex bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-black dark:to-gray-900">
      {/* Internal Settings Navigation */}
      <div className="w-64 border-r border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-black/50 backdrop-blur-xl overflow-y-auto">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent mb-2">
            Settings
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Manage your account and preferences
          </p>
        </div>

        <nav className="px-3 pb-6 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black shadow-lg'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium text-sm">{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
            </div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Profile Information</h2>
                    <p className="text-gray-600 dark:text-gray-400">Update your personal information and profile details</p>
                  </div>

                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Email</label>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full px-4 py-3 backdrop-blur-xl bg-gray-100 dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl text-gray-500 dark:text-gray-500 cursor-not-allowed"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Full Name</label>
                        <input
                          type="text"
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          placeholder="John Doe"
                          className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Phone</label>
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                          className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Location</label>
                        <input
                          type="text"
                          value={profile.location}
                          onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                          placeholder="San Francisco, CA"
                          className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Bio</label>
                      <textarea
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white resize-none"
                      />
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>
              )}

              {/* Appearance Tab */}
              {activeTab === 'appearance' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Appearance</h2>
                    <p className="text-gray-600 dark:text-gray-400">Customize the look and feel of your interface</p>
                  </div>

                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl space-y-6">
                    {/* Theme Mode */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-black dark:text-white">Theme Mode</label>
                      <div className="flex gap-3">
                        <button
                          onClick={toggleTheme}
                          className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                            theme === 'light'
                              ? 'bg-gradient-to-br from-gray-100 to-white border-black shadow-lg'
                              : 'bg-white/10 border-gray-700 hover:border-gray-500'
                          }`}
                        >
                          <div className="text-2xl mb-2">☀️</div>
                          <div className="font-semibold text-gray-900 dark:text-white">Light</div>
                        </button>
                        <button
                          onClick={toggleTheme}
                          className={`flex-1 p-4 rounded-2xl border-2 transition-all ${
                            theme === 'dark'
                              ? 'bg-gradient-to-br from-gray-900 to-black border-white shadow-lg'
                              : 'bg-black/10 border-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <div className="text-2xl mb-2">🌙</div>
                          <div className="font-semibold text-gray-900 dark:text-white">Dark</div>
                        </button>
                      </div>
                    </div>

                    {/* Glass Effect */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-black dark:text-white">Glass Effect</label>
                      <div className="grid grid-cols-2 gap-3">
                        {(['default', 'strong', 'subtle', 'vibrant'] as const).map((style) => (
                          <button
                            key={style}
                            onClick={() => setGlassStyle(style)}
                            className={`p-4 rounded-2xl border-2 transition-all capitalize ${
                              glassStyle === style
                                ? 'bg-gradient-to-br from-black/20 to-gray-700/20 dark:from-white/20 dark:to-gray-300/20 border-black dark:border-white shadow-lg'
                                : 'bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
                            }`}
                          >
                            <div className="font-semibold text-gray-900 dark:text-white">{style}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-black dark:text-white">Font Size</label>
                      <div className="flex gap-3">
                        {(['small', 'medium', 'large'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setFontSize(size)}
                            className={`flex-1 p-4 rounded-2xl border-2 transition-all capitalize ${
                              fontSize === size
                                ? 'bg-gradient-to-br from-black/20 to-gray-700/20 dark:from-white/20 dark:to-gray-300/20 border-black dark:border-white shadow-lg'
                                : 'bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-700 hover:border-black dark:hover:border-white'
                            }`}
                          >
                            <div
                              className={`font-semibold text-gray-900 dark:text-white ${
                                size === 'small' ? 'text-sm' : size === 'large' ? 'text-lg' : 'text-base'
                              }`}
                            >
                              {size}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Accent Color */}
                    <div>
                      <label className="block text-sm font-semibold mb-3 text-black dark:text-white">Accent Color</label>
                      <div className="grid grid-cols-5 gap-3">
                        {([
                          { name: 'gray', color: 'bg-gray-500' },
                          { name: 'blue', color: 'bg-blue-500' },
                          { name: 'purple', color: 'bg-purple-500' },
                          { name: 'green', color: 'bg-green-500' },
                          { name: 'red', color: 'bg-red-500' },
                        ] as const).map((item) => (
                          <button
                            key={item.name}
                            onClick={() => setAccentColor(item.name)}
                            className={`p-4 rounded-2xl border-2 transition-all ${
                              accentColor === item.name
                                ? 'border-black dark:border-white shadow-lg scale-110'
                                : 'border-gray-300 dark:border-gray-700 hover:scale-105'
                            }`}
                          >
                            <div className={`w-full h-8 rounded-xl ${item.color}`}></div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveAppearance}
                      disabled={saving}
                      className="bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Saving...' : 'Save Appearance'}
                    </button>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Security</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage your password and security settings</p>
                  </div>

                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.current ? 'text' : 'password'}
                          value={passwordForm.current_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                          className="w-full px-4 py-3 pr-12 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white"
                        >
                          {showPassword.current ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.new ? 'text' : 'password'}
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                          placeholder="At least 8 characters"
                          className="w-full px-4 py-3 pr-12 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white"
                        >
                          {showPassword.new ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPassword.confirm ? 'text' : 'password'}
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                          className="w-full px-4 py-3 pr-12 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black dark:hover:text-white"
                        >
                          {showPassword.confirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleChangePassword}
                      disabled={saving}
                      className="bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Notifications</h2>
                    <p className="text-gray-600 dark:text-gray-400">Control what notifications you receive</p>
                  </div>

                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/50">
                        <div>
                          <div className="font-semibold text-black dark:text-white capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {key === 'email_notifications' && 'Receive email notifications for important updates'}
                            {key === 'chat_notifications' && 'Get notified of new messages in chat'}
                            {key === 'security_alerts' && 'Receive alerts about security events'}
                          </div>
                        </div>
                        <button
                          onClick={() => setNotifications({ ...notifications, [key]: !value })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleSaveNotifications}
                      disabled={saving}
                      className="bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Saving...' : 'Save Notifications'}
                    </button>
                  </div>
                </div>
              )}

              {/* Privacy Tab */}
              {activeTab === 'privacy' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Privacy</h2>
                    <p className="text-gray-600 dark:text-gray-400">Control your privacy and data preferences</p>
                  </div>

                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/50">
                      <div>
                        <div className="font-semibold text-black dark:text-white">Profile Visibility</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Control who can see your profile</div>
                      </div>
                      <select
                        value={privacy.profile_visibility}
                        onChange={(e) => setPrivacy({ ...privacy, profile_visibility: e.target.value })}
                        className="px-4 py-2 rounded-xl bg-white dark:bg-black border border-gray-300 dark:border-gray-700 text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                    </div>

                    {Object.entries(privacy).filter(([key]) => key !== 'profile_visibility').map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/50">
                        <div>
                          <div className="font-semibold text-black dark:text-white capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {key === 'show_online_status' && 'Let others see when you\'re online'}
                            {key === 'data_collection' && 'Allow us to collect anonymous usage data'}
                          </div>
                        </div>
                        <button
                          onClick={() => setPrivacy({ ...privacy, [key]: !value })}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            value ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                              value ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={handleSavePrivacy}
                      disabled={saving}
                      className="bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Saving...' : 'Save Privacy'}
                    </button>
                  </div>
                </div>
              )}

              {/* AI Preferences Tab */}
              {activeTab === 'ai' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">AI Preferences</h2>
                    <p className="text-gray-600 dark:text-gray-400">Customize AI behavior and responses</p>
                  </div>

                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Default AI Model</label>
                      <select
                        value={aiPrefs.default_model}
                        onChange={(e) => setAiPrefs({ ...aiPrefs, default_model: e.target.value })}
                        className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20 text-black dark:text-white"
                      >
                        <option value="gpt-oss">GPT-OSS 20B</option>
                        <option value="llama">Llama 70B</option>
                        <option value="deepseek">DeepSeek R1</option>
                        <option value="qwen">Qwen Coder</option>
                        <option value="grok">Grok Beta</option>
                        <option value="gemma">Gemma 2 27B</option>
                        <option value="qwen-vl">Qwen VL</option>
                        <option value="gemini">Gemini 2.5 Flash</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">
                        Temperature: {aiPrefs.temperature}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={aiPrefs.temperature}
                        onChange={(e) => setAiPrefs({ ...aiPrefs, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                        <span>Focused</span>
                        <span>Balanced</span>
                        <span>Creative</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-black dark:text-white">
                        Max Tokens: {aiPrefs.max_tokens}
                      </label>
                      <input
                        type="range"
                        min="100"
                        max="4000"
                        step="100"
                        value={aiPrefs.max_tokens}
                        onChange={(e) => setAiPrefs({ ...aiPrefs, max_tokens: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-white/50 dark:bg-black/50">
                      <div>
                        <div className="font-semibold text-black dark:text-white">Stream Responses</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Show AI responses as they're generated</div>
                      </div>
                      <button
                        onClick={() => setAiPrefs({ ...aiPrefs, stream_responses: !aiPrefs.stream_responses })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          aiPrefs.stream_responses ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-black transition-transform ${
                            aiPrefs.stream_responses ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <button
                      onClick={handleSaveAI}
                      disabled={saving}
                      className="bg-gradient-to-r from-black to-gray-700 dark:from-white dark:to-gray-300 text-white dark:text-black py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Saving...' : 'Save AI Preferences'}
                    </button>
                  </div>
                </div>
              )}

              {/* Sessions Tab */}
              {activeTab === 'sessions' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Active Sessions</h2>
                    <p className="text-gray-600 dark:text-gray-400">Manage your active devices and sessions</p>
                  </div>

                  <div className="space-y-3">
                    {sessions.length === 0 ? (
                      <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-8 text-center">
                        <ComputerDesktopIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600 dark:text-gray-400">No active sessions</p>
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div
                          key={session.session_id}
                          className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-black to-gray-700 dark:from-white dark:to-gray-300 rounded-2xl flex items-center justify-center">
                              <ComputerDesktopIcon className="w-6 h-6 text-white dark:text-black" />
                            </div>
                            <div>
                              <div className="font-semibold text-black dark:text-white flex items-center gap-2">
                                {session.device}
                                {session.is_current && (
                                  <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-lg">Current</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {session.location} • {session.ip_address}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                Last active: {new Date(session.last_active).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          {!session.is_current && (
                            <button
                              onClick={() => handleRevokeSession(session.session_id)}
                              className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-semibold"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Data & Account Tab */}
              {activeTab === 'data' && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h2 className="text-3xl font-bold text-black dark:text-white mb-2">Data & Account</h2>
                    <p className="text-gray-600 dark:text-gray-400">Export your data or delete your account</p>
                  </div>

                  {/* Export Data */}
                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border border-gray-200/50 dark:border-gray-800/50 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                        <ArrowDownTrayIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-black dark:text-white">Export Your Data</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Download all your data in JSON format</p>
                      </div>
                    </div>
                    <button
                      onClick={handleExportData}
                      disabled={saving}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                    >
                      {saving ? 'Exporting...' : 'Export Data'}
                    </button>
                  </div>

                  {/* Delete Account */}
                  <div className="backdrop-blur-xl bg-white/70 dark:bg-black/70 border-2 border-red-500/50 rounded-3xl p-6 shadow-xl">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                        <TrashIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-black dark:text-white">Delete Account</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Permanently delete your account and all data</p>
                      </div>
                    </div>

                    <div className="backdrop-blur-xl bg-red-50/70 dark:bg-red-950/30 border border-red-500/30 rounded-2xl p-4 mb-4">
                      <p className="text-sm text-red-800 dark:text-red-300">
                        <strong>Warning:</strong> This action cannot be undone. All your data will be permanently deleted.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold mb-2 text-black dark:text-white">Confirm Password</label>
                        <input
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-4 py-3 backdrop-blur-xl bg-white/50 dark:bg-black/50 border border-gray-200/50 dark:border-gray-800/50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500/20 text-black dark:text-white"
                        />
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={confirmDelete}
                          onChange={(e) => setConfirmDelete(e.target.checked)}
                          className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                        />
                        <span className="text-sm text-black dark:text-white">
                          I understand this action is permanent and cannot be undone
                        </span>
                      </label>

                      <button
                        onClick={handleDeleteAccount}
                        disabled={saving || !confirmDelete || !deletePassword}
                        className="bg-gradient-to-r from-red-500 to-red-600 text-white py-3 px-6 rounded-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-xl"
                      >
                        {saving ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

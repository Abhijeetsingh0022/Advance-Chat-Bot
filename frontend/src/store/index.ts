/**
 * Zustand Store
 * Global state management for authentication and settings
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth store types
interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

// Auth store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user || !!get().token }),
      setToken: (token) => set({ token, isAuthenticated: !!token || !!get().user }),
      logout: () => {
        // Clear auth cookie for middleware
        if (typeof document !== 'undefined') {
          document.cookie = 'auth-token=; path=/; max-age=0';
        }
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Settings store types
type ThemeMode = 'light' | 'dark';
type GlassStyle = 'soft' | 'medium' | 'strong';
type FontSize = 'sm' | 'base' | 'lg' | 'xl';
type AccentColor = 'blue' | 'purple' | 'pink' | 'green' | 'orange' | 'red';

interface SettingsState {
  theme: ThemeMode;
  glassStyle: GlassStyle;
  fontSize: FontSize;
  accentColor: AccentColor;
  setTheme: (theme: ThemeMode) => void;
  setGlassStyle: (style: GlassStyle) => void;
  setFontSize: (size: FontSize) => void;
  setAccentColor: (color: AccentColor) => void;
  toggleTheme: () => void;
}

// Settings store
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      glassStyle: 'medium',
      fontSize: 'base',
      accentColor: 'purple',
      setTheme: (theme) => set({ theme }),
      setGlassStyle: (glassStyle) => set({ glassStyle }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAccentColor: (accentColor) => set({ accentColor }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'settings-storage',
    }
  )
);

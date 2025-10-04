import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AppSettings } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => {
        console.log('Setting user:', user?.email || 'null');
        set({ user, isAuthenticated: !!user });
      },
      setToken: (token) => {
        console.log('Setting token in store:', token ? 'exists' : 'null');
        if (token) {
          set({ token, isAuthenticated: true });
          console.log('Token saved to store, isAuthenticated: true');
        } else {
          set({ token: null, isAuthenticated: false });
          console.log('Token removed from store, isAuthenticated: false');
        }
      },
      logout: () => {
        console.log('Logging out...');
        set({ user: null, token: null, isAuthenticated: false });
        console.log('Logout complete - all data cleared');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

interface SettingsStore extends AppSettings {
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  // Theme customization
  glassStyle: 'default' | 'strong' | 'subtle' | 'vibrant';
  fontSize: 'small' | 'medium' | 'large';
  accentColor: 'gray' | 'blue' | 'purple' | 'green' | 'red';
  setGlassStyle: (style: 'default' | 'strong' | 'subtle' | 'vibrant') => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  setAccentColor: (color: 'gray' | 'blue' | 'purple' | 'green' | 'red') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      autoSave: true,
      notifications: true,
      glassStyle: 'default',
      fontSize: 'medium',
      accentColor: 'gray',
      setTheme: (theme) => {
        set({ theme });
        if (typeof window !== 'undefined') {
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      toggleTheme: () => {
        const newTheme = get().theme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
      },
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      updateSettings: (settings) => set(settings),
      setGlassStyle: (glassStyle) => set({ glassStyle }),
      setFontSize: (fontSize) => set({ fontSize }),
      setAccentColor: (accentColor) => set({ accentColor }),
    }),
    {
      name: 'settings-storage',
    }
  )
);

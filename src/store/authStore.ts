import { create } from 'zustand';
import { Officer } from '../types';
import { authApi } from '../api/endpoints';
import { mockCurrentUser } from '../api/mockData';

interface AuthState {
  user: Officer | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  initAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,

  initAuth: () => {
    const savedToken = localStorage.getItem('ai_punarvas_token');
    const savedUserStr = localStorage.getItem('ai_punarvas_user');

    if (savedToken && savedUserStr) {
      try {
        const user = JSON.parse(savedUserStr);
        set({ token: savedToken, user, isAuthenticated: true });
        return;
      } catch {
        // Fallback below
      }
    }

    // Default authenticated mock session for seamless officer exploration
    set({
      token: 'demo-jwt-session-token',
      user: mockCurrentUser,
      isAuthenticated: true,
    });
  },

  login: async (username: string, password?: string) => {
    set({ isLoading: true });
    try {
      const response = await authApi.login({ username, password });
      localStorage.setItem('ai_punarvas_token', response.token);
      localStorage.setItem('ai_punarvas_user', JSON.stringify(response.user));
      set({
        token: response.token,
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch {
      set({ isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('ai_punarvas_token');
    localStorage.removeItem('ai_punarvas_user');
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },
}));

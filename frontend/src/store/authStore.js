/**
 * Authentication store (Zustand + persist).
 * Holds the current user, JWT token, and async auth actions.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from '../api/axios';
import i18n from '../i18n/i18n';

const useAuthStore = create(
  persist(
    (set, get) => ({
      currentUser : null,
      accessToken : null,
      isBusy      : false,
      authError   : null,

      /* Convenience aliases used by components */
      get user()  { return get().currentUser; },
      get token() { return get().accessToken; },

      setCurrentUser : (u) => set({ currentUser: u }),
      updateUser     : (patch) => set((s) => ({ currentUser: { ...s.currentUser, ...patch } })),

      /* ── Sign in ── */
      login: async (credentials) => {
        set({ isBusy: true, authError: null });
        try {
          const { data } = await apiClient.post('/auth/login', credentials);
          set({ currentUser: data.user, accessToken: data.token, isBusy: false });
          if (data.user?.languagePreference) {
            i18n.changeLanguage(data.user.languagePreference);
          }
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Sign in failed';
          set({ authError: msg, isBusy: false });
          return { success: false, message: msg };
        }
      },

      /* ── Register ── */
      register: async (formData) => {
        set({ isBusy: true, authError: null });
        try {
          const { data } = await apiClient.post('/auth/register', formData);
          set({ currentUser: data.user, accessToken: data.token, isBusy: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.message || 'Registration failed';
          set({ authError: msg, isBusy: false });
          return { success: false, message: msg };
        }
      },

      /* ── Sign out ── */
      logout: async () => {
        try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
        set({ currentUser: null, accessToken: null });
        i18n.changeLanguage('en');
      },

      /* ── Refresh user from server ── */
      refreshUser: async () => {
        try {
          const { data } = await apiClient.get('/auth/me');
          set({ currentUser: data.user });
          if (data.user?.languagePreference) {
            i18n.changeLanguage(data.user.languagePreference);
          }
        } catch {
          set({ currentUser: null, accessToken: null });
        }
      },

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name      : 'cb-auth',
      partialize: (s) => ({ accessToken: s.accessToken, currentUser: s.currentUser }),
    }
  )
);

export default useAuthStore;

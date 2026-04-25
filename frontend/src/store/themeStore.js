/**
 * Theme store — persists dark/light mode preference.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const applyTheme = (dark) => {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const useThemeStore = create(
  persist(
    (set, get) => ({
      darkMode: false,

      toggleTheme: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        applyTheme(next);
      },

      /* Call once on app mount to restore persisted preference */
      applyStoredTheme: () => applyTheme(get().darkMode),
    }),
    { name: 'cb-theme' }
  )
);

export default useThemeStore;

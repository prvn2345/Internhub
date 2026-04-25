/**
 * Pre-configured Axios instance for CareerBridge API.
 * Automatically attaches the stored JWT and handles global 401 redirects.
 */

import axios from 'axios';

// Use env var if set, otherwise fall back to the deployed Render backend
const BASE_URL =
  process.env.REACT_APP_API_URL ||
  'https://careerbridge-api-zevz.onrender.com/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/* Attach Bearer token from persisted Zustand store */
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('cb-auth');
    if (raw) {
      const { state } = JSON.parse(raw);
      // Zustand persists it as 'accessToken'
      const token = state?.accessToken || state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    /* Silently ignore parse errors */
  }
  return config;
});

/* Redirect to login only on real 401s, not network errors */
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || '';
      if (!url.includes('/auth/me')) {
        localStorage.removeItem('cb-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default apiClient;

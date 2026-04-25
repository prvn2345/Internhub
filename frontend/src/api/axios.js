/**
 * Pre-configured Axios instance for CareerBridge API.
 * Automatically attaches the stored JWT and handles global 401 redirects.
 */

import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

/* Attach Bearer token from persisted Zustand store */
apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem('cb-auth');
    if (raw) {
      const { state } = JSON.parse(raw);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
  } catch {
    /* Silently ignore parse errors */
  }
  return config;
});

/* Redirect to login on expired / invalid token */
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cb-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default apiClient;

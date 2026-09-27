import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // sends HttpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: on 401, attempt one token refresh, then retry original request
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh if the failed request was already /auth/refresh or /auth/logout
    if (originalRequest?.url?.includes('/auth/refresh') || originalRequest?.url?.includes('/auth/logout')) {
      useAuthStore.getState().clearUser();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(originalRequest);
      } catch (refreshErr) {
        useAuthStore.getState().clearUser();
        // Only redirect to landing if on a protected route to avoid page reload loops
        const path = window.location.pathname;
        if (path !== '/' && path !== '/verify-email') {
          window.location.href = '/';
        }
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

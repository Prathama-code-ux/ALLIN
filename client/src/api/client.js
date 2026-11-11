import axios from 'axios';

// Resolve unified API base URL
const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const baseURL = rawBase.endsWith('/api')
  ? rawBase
  : `${rawBase.replace(/\/+$/, '')}/api`;

// Create base Axios instance
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: inject JWT Bearer token into Authorization header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('allin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 unauthenticated errors gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const publicPaths = ['/login', '/register', '/welcome', '/'];
      const currentPath = window.location.pathname;

      if (!publicPaths.includes(currentPath)) {
        localStorage.removeItem('allin_token');
        localStorage.removeItem('allin_user');
        window.dispatchEvent(new Event('allin_auth_expired'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';

// Create base Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
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
      // Don't auto-redirect if we're already on login/register/welcome
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


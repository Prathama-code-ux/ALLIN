import api from '../api/client';

export const authService = {
  // Register a new user
  async register({ name, email, password }) {
    const response = await api.post('/auth/register', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    return response.data;
  },

  // Login existing user
  async login({ email, password }) {
    const response = await api.post('/auth/login', {
      email: email.trim().toLowerCase(),
      password,
    });
    return response.data;
  },

  // Fetch current authenticated user's profile
  async getMe() {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // Store auth session
  saveSession(token, user) {
    if (token) localStorage.setItem('allin_token', token);
    if (user) localStorage.setItem('allin_user', JSON.stringify(user));
  },

  // Clear auth session
  clearSession() {
    localStorage.removeItem('allin_token');
    localStorage.removeItem('allin_user');
  },

  // Get current cached token
  getToken() {
    return localStorage.getItem('allin_token');
  },

  // Get current cached user object
  getCachedUser() {
    const saved = localStorage.getItem('allin_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  },
};

export default authService;

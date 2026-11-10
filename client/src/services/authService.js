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
  // Note: Backend router specifically registers router.post("/me", protect, getMe)
  async getMe() {
    try {
      const response = await api.post('/auth/me');
      return response.data;
    } catch (err) {
      // In case backend changes to GET in future, provide graceful fallback
      if (err.response && (err.response.status === 404 || err.response.status === 405)) {
        const fallbackResponse = await api.get('/auth/me');
        return fallbackResponse.data;
      }
      throw err;
    }
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


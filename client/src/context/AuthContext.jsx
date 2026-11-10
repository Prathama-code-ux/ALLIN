import React, { useState, useEffect } from 'react';
import { AuthContext } from './authContextInstance';
import authService from '../services/authService';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCachedUser());
  const [token, setToken] = useState(() => authService.getToken());
  const [loading, setLoading] = useState(() => Boolean(authService.getToken() && !authService.getCachedUser()));
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const currentToken = authService.getToken();

    if (currentToken && !authService.getCachedUser()) {
      authService
        .getMe()
        .then((data) => {
          if (isMounted && data?.user) {
            setUser(data.user);
            authService.saveSession(currentToken, data.user);
          }
        })
        .catch((err) => {
          console.warn('Session verification error:', err.message);
          if (isMounted) {
            authService.clearSession();
            setUser(null);
            setToken(null);
          }
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }

    const handleExpired = () => {
      authService.clearSession();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('allin_auth_expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('allin_auth_expired', handleExpired);
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      const data = await authService.login({ email, password });
      authService.saveSession(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Login failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const data = await authService.register({ name, email, password });
      authService.saveSession(data.token, data.user);
      setToken(data.token);
      setUser(data.user);
      return data;
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Registration failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    authService.clearSession();
    setUser(null);
    setToken(null);
    setError(null);
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

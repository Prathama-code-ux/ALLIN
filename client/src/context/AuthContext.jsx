import React, { useState, useEffect, useCallback } from 'react';
import { AuthContext } from './authContextInstance';
import authService from '../services/authService';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => authService.getToken());
  const [user, setUser] = useState(() => authService.getCachedUser());
  const [loading, setLoading] = useState(() => Boolean(authService.getToken()));
  const [authError, setAuthError] = useState(null);

  // Synchronize and verify session with backend
  const verifySession = useCallback(async () => {
    const existingToken = authService.getToken();
    if (!existingToken) {
      setLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      if (data && data.user) {
        setUser(data.user);
        authService.saveSession(existingToken, data.user);
      }
    } catch (err) {
      console.warn('Session verification error:', err?.response?.data?.message || err.message);
      if (err?.response?.status === 401) {
        authService.clearSession();
        setUser(null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const existingToken = authService.getToken();

    if (existingToken) {
      authService
        .getMe()
        .then((data) => {
          if (isMounted && data?.user) {
            setUser(data.user);
            authService.saveSession(existingToken, data.user);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn('Session verification error:', err?.response?.data?.message || err.message);
            if (err?.response?.status === 401) {
              authService.clearSession();
              setUser(null);
              setToken(null);
            }
          }
        })
        .finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
    }

    const handleExpired = () => {
      setUser(null);
      setToken(null);
      setAuthError('Your session has expired. Please log in again.');
    };

    window.addEventListener('allin_auth_expired', handleExpired);
    return () => {
      isMounted = false;
      window.removeEventListener('allin_auth_expired', handleExpired);
    };
  }, []);

  // Login handler
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await authService.login({ email, password });
      if (data && data.token) {
        authService.saveSession(data.token, data.user);
        setToken(data.token);
        setUser(data.user);
        return { success: true, data };
      }
      throw new Error(data?.message || 'Login failed');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Login failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // Registration handler
  const register = async (name, email, password) => {
    setAuthError(null);
    try {
      const data = await authService.register({ name, email, password });
      if (data && data.token) {
        authService.saveSession(data.token, data.user);
        setToken(data.token);
        setUser(data.user);
        return { success: true, data };
      }
      throw new Error(data?.message || 'Registration failed');
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Registration failed';
      setAuthError(message);
      return { success: false, error: message };
    }
  };

  // Logout handler
  const logout = () => {
    authService.clearSession();
    setUser(null);
    setToken(null);
    setAuthError(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    authError,
    setAuthError,
    login,
    register,
    logout,
    refreshUser: verifySession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;

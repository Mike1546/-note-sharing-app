import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

let lastAuthCheck = 0;
const AUTH_CHECK_INTERVAL = 300000; // 5 minutes

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Check token expiration before making the request
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000; // Convert to milliseconds
        if (expiry < Date.now()) {
          localStorage.removeItem('token');
          setUser(null);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error checking token:', err);
        localStorage.removeItem('token');
        setUser(null);
        setLoading(false);
        return;
      }

      const now = Date.now();
      if (now - lastAuthCheck < AUTH_CHECK_INTERVAL && user) {
        setLoading(false);
        return;
      }

      lastAuthCheck = now;
      const res = await api.get('/api/auth/me');
      setUser(res.data);
      setError(null);
    } catch (err) {
      console.error('Auth check error:', err);
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
      setError(err.response?.data?.message || 'Error loading user');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadUser();
    // Set up periodic check for token validity with increased interval
    const interval = setInterval(loadUser, AUTH_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [loadUser]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setError(null);
      lastAuthCheck = Date.now();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      setError(null);
      lastAuthCheck = Date.now();
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    lastAuthCheck = 0;
  };

  const updateProfile = async (data) => {
    try {
      const res = await api.put('/api/auth/profile', data);
      setUser(res.data.user);
      setError(null);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Profile update failed');
      return false;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 
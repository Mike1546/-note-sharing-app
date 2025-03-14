import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configure axios defaults
axios.defaults.headers.post['Content-Type'] = 'application/json';

// Flag to prevent redirect loops
let isRedirecting = false;
let lastAuthCheck = 0;
const AUTH_CHECK_INTERVAL = 5000; // 5 seconds

// Add request interceptor to add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isRedirecting) {
      const now = Date.now();
      if (now - lastAuthCheck > AUTH_CHECK_INTERVAL) {
        isRedirecting = true;
        lastAuthCheck = now;
        localStorage.removeItem('token');
        setTimeout(() => {
          window.location.href = '/login';
          isRedirecting = false;
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

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
        setLoading(false);
        return;
      }

      const now = Date.now();
      if (now - lastAuthCheck < AUTH_CHECK_INTERVAL) {
        return;
      }

      lastAuthCheck = now;
      const res = await axios.get('/api/auth/me');
      setUser(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        setUser(null);
      }
      setError(err.response?.data?.message || 'Error loading user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
    // Set up periodic check for token validity
    const interval = setInterval(loadUser, AUTH_CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, [loadUser]);

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
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
      const res = await axios.post('/api/auth/register', { name, email, password });
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
      const res = await axios.put('/api/auth/profile', data);
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
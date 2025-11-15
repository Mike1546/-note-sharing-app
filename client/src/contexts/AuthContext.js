import React, { createContext, useContext, useState, useEffect } from 'react';
import { account } from '../appwrite';
import profilesService from '../services/profiles';

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

  const loadUser = async () => {
    setLoading(true);
    try {
      const current = await account.get();
        // Try to load profile (role) from profiles collection
        let profile = null;
        try {
          profile = await profilesService.getProfileByUserId(current.$id);
        } catch (e) {
          console.warn('No profile found for user', e);
        }
        setUser({ ...current, profile });
      setError(null);
    } catch (err) {
      // Not logged in or session expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  const login = async (email, password) => {
    try {
      await account.createSession(email, password);
      const current = await account.get();
      // load profile for role checks
      try {
        const profile = await profilesService.getProfileByUserId(current.$id);
        setUser({ ...current, profile });
      } catch (e) {
        setUser(current);
      }
      setError(null);
      return true;
    } catch (err) {
      console.error('Appwrite login error:', err);
      setError(err.message || 'Login failed');
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      // Appwrite Account.create expects name as a string (4th arg), not an object
      await account.create('unique()', email, password, name || undefined);
      await account.createSession(email, password);
      const current = await account.get();
        // Create profile document for role management
        try {
          await profilesService.createProfile(current.$id, name || '', current.email || '');
          const profile = await profilesService.getProfileByUserId(current.$id);
          setUser({ ...current, profile });
        } catch (e) {
          console.warn('Failed to create profile document:', e);
          setUser(current);
        }
      setError(null);
      return true;
    } catch (err) {
      console.error('Appwrite register error:', err);
      setError(err.message || 'Registration failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (err) {
      console.warn('Error deleting Appwrite session:', err);
    }
    setUser(null);
  };

  const updateProfile = async (data) => {
    try {
      if (data.name) {
        await account.updateName(data.name);
      }
      if (data.email) {
        await account.updateEmail(data.email, data.password || '');
      }
      if (data.password) {
        await account.updatePassword(data.password, data.oldPassword || '');
      }
      const current = await account.get();
      setUser(current);
      setError(null);
      return true;
    } catch (err) {
      console.error('Appwrite updateProfile error:', err);
      setError(err.message || 'Profile update failed');
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
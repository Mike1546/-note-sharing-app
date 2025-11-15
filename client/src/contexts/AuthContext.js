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
      console.log('Attempting Appwrite login with endpoint:', process.env.REACT_APP_APPWRITE_ENDPOINT, 'project:', process.env.REACT_APP_APPWRITE_PROJECT);
      // Appwrite v13+: use email/password session API
      await account.createEmailPasswordSession(email, password);
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
      console.error('Appwrite login error (full):', err);
      console.error('Error type:', err?.type, 'Code:', err?.code, 'Message:', err?.message);
      // Handle case: a session already exists
      const alreadyExists =
        err?.type === 'user_session_already_exists' ||
        /session is active/i.test(err?.message || '');

      if (alreadyExists) {
        try {
          const current = await account.get();
          // If the existing session belongs to a different user, reset it and try again
          if (current?.email && current.email.toLowerCase() !== (email || '').toLowerCase()) {
            try { await account.deleteSession('current'); } catch (_) {}
            await account.createEmailPasswordSession(email, password);
          }
          const me = await account.get();
          try {
            const profile = await profilesService.getProfileByUserId(me.$id);
            setUser({ ...me, profile });
          } catch (_) {
            setUser(me);
          }
          setError(null);
          return true;
        } catch (inner) {
          console.error('Recovery after existing session failed:', inner);
          setError(inner?.message || 'Login failed - existing session conflict');
          return false;
        }
      }

      const msg = err?.message || err?.response?.message || 'Login failed - check console';
      setError(msg);
      return false;
    }
  };

  const register = async (name, email, password) => {
    try {
      console.log('Attempting Appwrite registration with endpoint:', process.env.REACT_APP_APPWRITE_ENDPOINT, 'project:', process.env.REACT_APP_APPWRITE_PROJECT);
      // Appwrite Account.create expects name as a string (4th arg), not an object
      await account.create('unique()', email, password, name || undefined);
      // Immediately sign in the user
      await account.createEmailPasswordSession(email, password);
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
      console.error('Appwrite register error (full):', err);
      console.error('Error type:', err?.type, 'Code:', err?.code, 'Message:', err?.message);
      const msg = err?.message || err?.response?.message || 'Registration failed - check console';
      setError(msg);
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
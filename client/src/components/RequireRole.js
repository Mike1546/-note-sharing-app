import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RequireRole = ({ children, roles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  const userRole = user?.profile?.role || 'user';

  if (!roles.includes(userRole)) {
    return <Navigate to="/" />;
  }

  return children;
};

export default RequireRole;

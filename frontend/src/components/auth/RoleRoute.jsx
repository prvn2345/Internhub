import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

/** Restricts access to specific account roles. */
const RoleGuard = ({ roles }) => {
  const { currentUser } = useAuthStore();

  if (!currentUser) return <Navigate to="/login" replace />;

  if (!roles.includes(currentUser.role)) {
    if (currentUser.role === 'admin')    return <Navigate to="/admin" replace />;
    if (currentUser.role === 'employer') return <Navigate to="/employer/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default RoleGuard;

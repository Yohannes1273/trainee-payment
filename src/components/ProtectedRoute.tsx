import React from 'react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles: string[];
  bypassPasswordCheck?: boolean;
}

export default function ProtectedRoute({ children, allowedRoles, bypassPasswordCheck = false }: ProtectedRouteProps) {
  const token = localStorage.getItem('college_payment_token');
  const userStr = localStorage.getItem('college_payment_user');

  if (!token || !userStr) {
    // No active session, redirect to login page
    return <Navigate to="/" replace />;
  }

  try {
    const user = JSON.parse(userStr);
    
    // Check role clearance
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }

    // First login check: force change password if false and not bypassed
    if (user.isPasswordChanged === false && !bypassPasswordCheck) {
      return <Navigate to="/change-password" replace />;
    }

    // Clearance granted, render component
    return children;
  } catch (error) {
    console.error('[Protected Route] Session corruption:', error);
    localStorage.clear();
    return <Navigate to="/" replace />;
  }
}

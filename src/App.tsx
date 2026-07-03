import React from 'react';
import { 
  HashRouter, Routes, Route, Navigate 
} from 'react-router-dom';

// Core security guards and pages
import ProtectedRoute from './components/ProtectedRoute';
import UnauthorizedPage from './pages/UnauthorizedPage';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';

// Dashboards
import TraineeDashboard from './pages/TraineeDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import NightControllerDashboard from './pages/NightControllerDashboard';
import StaffPortal from './pages/StaffPortal';
import ChangePasswordPage from './pages/ChangePasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Toast system
import { ToastProvider } from './components/Toast';

// Theme & User Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { UserProvider } from './context/UserContext';

export default function App() {
  return (
    <ThemeProvider>
      <UserProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              {/* Entry Login Gateway */}
              <Route path="/" element={<Login />} />

              {/* Onboarding Register Gateway */}
              <Route path="/register" element={<Register />} />

              {/* Trainee Portal Gate */}
              <Route 
                path="/trainee" 
                element={
                  <ProtectedRoute allowedRoles={['Trainee']}>
                    <TraineeDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Finance Operations Gate */}
              <Route 
                path="/finance" 
                element={
                  <ProtectedRoute allowedRoles={['Finance']}>
                    <FinanceDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Night Controller Gate */}
              <Route 
                path="/night-controller" 
                element={
                  <ProtectedRoute allowedRoles={['Night Controller']}>
                    <NightControllerDashboard />
                  </ProtectedRoute>
                } 
              />

              {/* Relational Academic Setup Gate (Registrar, HR, Dept Head, Trainer) */}
              <Route 
                path="/staff-portal" 
                element={
                  <ProtectedRoute allowedRoles={['Registrar', 'HR', 'Department Head', 'Trainer']}>
                    <StaffPortal />
                  </ProtectedRoute>
                } 
              />

              {/* Change Password Portal */}
              <Route 
                path="/change-password" 
                element={
                  <ProtectedRoute 
                    allowedRoles={['Registrar', 'HR', 'Department Head', 'Trainer', 'Trainee', 'Finance', 'Night Controller']} 
                    bypassPasswordCheck={true}
                  >
                    <ChangePasswordPage />
                  </ProtectedRoute>
                } 
              />

              {/* Password Reset Page */}
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Safety Interceptor */}
              <Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Catch-all fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </UserProvider>
    </ThemeProvider>
  );
}

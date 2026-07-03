import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: 'Registrar' | 'HR' | 'Department Head' | 'Trainer' | 'Trainee' | 'Finance' | 'Night Controller';
  fullName: string;
  isPasswordChanged: boolean;
  profilePicture: string | null;
  departmentId?: string | null;
  department?: string | null;
}

export interface TraineeProfile {
  _id: string;
  userId: string;
  sectionId: string;
  rollNumber: string;
  telegramChatId?: string;
  telegramAlertsEnabled?: boolean;
  admissionStatus: string;
}

interface UserContextType {
  user: UserProfile | null;
  trainee: TraineeProfile | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  register: (formData: any) => Promise<UserProfile>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [trainee, setTrainee] = useState<TraineeProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session from localStorage on startup
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('college_payment_token');
      const storedUserStr = localStorage.getItem('college_payment_user');
      const storedTraineeStr = localStorage.getItem('college_payment_trainee');

      if (storedToken) {
        setToken(storedToken);
        if (storedUserStr) {
          try {
            setUser(JSON.parse(storedUserStr));
          } catch (_) {}
        }
        if (storedTraineeStr) {
          try {
            setTrainee(JSON.parse(storedTraineeStr));
          } catch (_) {}
        }

        // Verify/refresh user profile from server `/auth/me` to ensure fresh RBAC state
        try {
          const res = await api.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
            setTrainee(res.data.trainee || null);
            localStorage.setItem('college_payment_user', JSON.stringify(res.data.user));
            if (res.data.trainee) {
              localStorage.setItem('college_payment_trainee', JSON.stringify(res.data.trainee));
            } else {
              localStorage.removeItem('college_payment_trainee');
            }
          }
        } catch (err) {
          console.error('[UserContext] Stale or invalid JWT token found:', err);
          // 401 interceptor in api.ts will handle auto-purge, but let's clear as safety
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token: receivedToken, user: receivedUser, trainee: receivedTrainee } = response.data;

      localStorage.setItem('college_payment_token', receivedToken);
      localStorage.setItem('college_payment_user', JSON.stringify(receivedUser));
      if (receivedTrainee) {
        localStorage.setItem('college_payment_trainee', JSON.stringify(receivedTrainee));
      } else {
        localStorage.removeItem('college_payment_trainee');
      }

      setToken(receivedToken);
      setUser(receivedUser);
      setTrainee(receivedTrainee || null);

      return receivedUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (formData: any): Promise<UserProfile> => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData);
      const { token: receivedToken, user: receivedUser, trainee: receivedTrainee } = response.data;

      localStorage.setItem('college_payment_token', receivedToken);
      localStorage.setItem('college_payment_user', JSON.stringify(receivedUser));
      if (receivedTrainee) {
        localStorage.setItem('college_payment_trainee', JSON.stringify(receivedTrainee));
      } else {
        localStorage.removeItem('college_payment_trainee');
      }

      setToken(receivedToken);
      setUser(receivedUser);
      setTrainee(receivedTrainee || null);

      return receivedUser;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('college_payment_token');
    localStorage.removeItem('college_payment_user');
    localStorage.removeItem('college_payment_trainee');
    setToken(null);
    setUser(null);
    setTrainee(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data && res.data.user) {
        setUser(res.data.user);
        setTrainee(res.data.trainee || null);
        localStorage.setItem('college_payment_user', JSON.stringify(res.data.user));
        if (res.data.trainee) {
          localStorage.setItem('college_payment_trainee', JSON.stringify(res.data.trainee));
        } else {
          localStorage.removeItem('college_payment_trainee');
        }
      }
    } catch (err) {
      console.error('[UserContext] Failed to refresh user profile:', err);
    }
  };

  return (
    <UserContext.Provider value={{ user, trainee, token, loading, login, register, logout, refreshUser }}>
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
}

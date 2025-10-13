"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';

interface AuthUser {
  id: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Staff' | 'Viewer';
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('authUser');
    if (storedUser) {
      try {
        const parsedUser: AuthUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
        localStorage.removeItem('authUser');
      }
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (email === 'admin@example.com' && password === 'password') {
          const mockUser: AuthUser = {
            id: 'user-admin-123',
            email: 'admin@example.com',
            role: 'Admin',
            token: 'mock-admin-token',
          };
          localStorage.setItem('authUser', JSON.stringify(mockUser));
          setUser(mockUser);
          setIsAuthenticated(true);
          showSuccess('Login successful! Redirecting...');
          resolve();
        } else if (email === 'manager@example.com' && password === 'password') {
          const mockUser: AuthUser = {
            id: 'user-manager-123',
            email: 'manager@example.com',
            role: 'Manager',
            token: 'mock-manager-token',
          };
          localStorage.setItem('authUser', JSON.stringify(mockUser));
          setUser(mockUser);
          setIsAuthenticated(true);
          showSuccess('Login successful! Redirecting...');
          resolve();
        } else if (email === 'staff@example.com' && password === 'password') {
          const mockUser: AuthUser = {
            id: 'user-staff-123',
            email: 'staff@example.com',
            role: 'Staff',
            token: 'mock-staff-token',
          };
          localStorage.setItem('authUser', JSON.stringify(mockUser));
          setUser(mockUser);
          setIsAuthenticated(true);
          showSuccess('Login successful! Redirecting...');
          resolve();
        } else if (email === 'viewer@example.com' && password === 'password') {
          const mockUser: AuthUser = {
            id: 'user-viewer-123',
            email: 'viewer@example.com',
            role: 'Viewer',
            token: 'mock-viewer-token',
          };
          localStorage.setItem('authUser', JSON.stringify(mockUser));
          setUser(mockUser);
          setIsAuthenticated(true);
          showSuccess('Login successful! Redirecting...');
          resolve();
        }
        else {
          showError('Invalid email or password.');
          reject(new Error('Invalid credentials'));
        }
      }, 1000);
    });
  };

  const logout = () => {
    localStorage.removeItem('authUser');
    setUser(null);
    setIsAuthenticated(false);
    showSuccess('Logged out successfully.');
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
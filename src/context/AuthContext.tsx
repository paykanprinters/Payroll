"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  role: 'Admin' | 'Manager' | 'Staff' | 'Viewer';
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // New loading state
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        // Fetch user role from public.users table
        const { data: profile, error } = await supabase
          .from('users')
          .select('id, email, name, role')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
          setIsAuthenticated(false);
          showError('Failed to load user profile. Please try logging in again.');
          navigate('/login');
        } else if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
          });
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false); // Auth state determined
    });

    // Check initial session
    const checkInitialSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session) {
        // Session exists, fetch profile
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('id, email, name, role')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching initial user profile:', profileError);
          setUser(null);
          setIsAuthenticated(false);
          showError('Failed to load user profile. Please try logging in again.');
          navigate('/login');
        } else if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
          });
          setIsAuthenticated(true);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoadingAuth(false);
    };

    checkInitialSession();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    setIsLoadingAuth(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      setIsLoadingAuth(false);
      throw error;
    }

    if (data.user) {
      // Fetch user role from public.users table
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, email, name, role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile after login:', profileError);
        showError('Login successful, but failed to load user profile. Please contact support.');
        await supabase.auth.signOut(); // Log out if profile fetch fails
        setIsLoadingAuth(false);
        throw profileError;
      } else if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
        });
        setIsAuthenticated(true);
        showSuccess('Login successful! Redirecting...');
        navigate('/dashboard', { replace: true });
      }
    }
    setIsLoadingAuth(false);
  };

  const logout = async () => {
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      showError(error.message);
      setIsLoadingAuth(false);
      throw error;
    }

    setUser(null);
    setIsAuthenticated(false);
    showSuccess('Logged out successfully.');
    navigate('/login');
    setIsLoadingAuth(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, isLoadingAuth }}>
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
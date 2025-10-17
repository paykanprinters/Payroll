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
  name: string;
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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Initial state is true, as we're loading auth
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    
    const handleAuthStateChange = async (event: string, session: any | null) => {
      console.log("Auth state change event:", event, "session:", session); // Debugging log
      if (!isMounted) return; // Prevent state updates if component unmounted

      try {
        if (session) {
          const { data: profile, error } = await supabase
            .from('users')
            .select('id, email, name, role')
            .eq('id', session.user.id)
            .single();

          if (error) {
            console.error('Error fetching user profile:', error);
            if (isMounted) {
              setUser(null);
              setIsAuthenticated(false);
              showError('Failed to load user profile. Please try logging in again.');
              navigate('/login', { replace: true });
            }
          } else if (profile) {
            if (isMounted) {
              setUser({
                id: profile.id,
                email: profile.email,
                role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
                name: profile.name ?? profile.email,
              });
              setIsAuthenticated(true);
            }
          }
        } else {
          if (isMounted) {
            setUser(null);
            setIsAuthenticated(false);
            if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
              navigate('/login', { replace: true });
            }
          }
        }
      } catch (err) {
        console.error("Unhandled error in onAuthStateChange listener:", err);
        if (isMounted) {
          showError('An unexpected error occurred during authentication state change.');
          setUser(null);
          setIsAuthenticated(false);
          navigate('/login', { replace: true });
        }
      } finally {
        if (isMounted) {
          console.log("AuthContext: Setting isLoadingAuth to false in finally block for event:", event);
          setIsLoadingAuth(false);
        }
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => {
      isMounted = false; // Cleanup: component is unmounted
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      throw error;
    }

    if (data.user) {
      showSuccess('Login successful! Redirecting...');
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      showError(error.message);
      throw error;
    }
    showSuccess('Logged out successfully.');
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
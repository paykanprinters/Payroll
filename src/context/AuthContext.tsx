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
    // Set loading to true at the very beginning of the effect
    setIsLoadingAuth(true);

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change event:", event, "session:", session); // Debugging log
      try {
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
            navigate('/login', { replace: true }); // Redirect on profile fetch error
          } else if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
              name: profile.name ?? profile.email, // Ensure name is always a string, fallback to email
            });
            setIsAuthenticated(true);
          }
        } else {
          // This block handles SIGNED_OUT, INITIAL_SESSION (if no session), etc.
          setUser(null);
          setIsAuthenticated(false);
          // Only navigate to login if the event is explicitly SIGNED_OUT
          // or if it's an initial session check and there's no session.
          if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
            navigate('/login', { replace: true });
          }
        }
      } catch (err) {
        console.error("Unhandled error in onAuthStateChange listener:", err);
        showError('An unexpected error occurred during authentication state change.');
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login', { replace: true });
      } finally {
        setIsLoadingAuth(false); // Ensure loading is always false after processing auth state change
      }
    });

    // No need for a separate checkInitialSession function call here.
    // The onAuthStateChange listener with 'INITIAL_SESSION' event handles the initial state.

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const login = async (email: string, password: string) => {
    // Do NOT set isLoadingAuth here. Rely on onAuthStateChange.
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(error.message);
      // If login fails, onAuthStateChange won't fire a SIGNED_IN event,
      // so isLoadingAuth will remain false (from the initial effect).
      throw error;
    }

    if (data.user) {
      // onAuthStateChange will handle setting user, isAuthenticated, and navigating.
      showSuccess('Login successful! Redirecting...');
    }
  };

  const logout = async () => {
    // Do NOT set isLoadingAuth here. Rely on onAuthStateChange.
    const { error } = await supabase.auth.signOut();

    if (error) {
      showError(error.message);
      throw error;
    }
    showSuccess('Logged out successfully.');
    // The onAuthStateChange listener will now handle setting isAuthenticated/user to null
    // and navigating to /login when it receives the 'SIGNED_OUT' event.
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
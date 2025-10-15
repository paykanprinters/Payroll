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
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // New loading state
  const navigate = useNavigate();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change event:", event, "session:", session); // Debugging log
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
          setIsLoadingAuth(false); // Set loading to false before navigating
          navigate('/login', { replace: true }); // Redirect on profile fetch error
        } else if (profile) {
          setUser({
            id: profile.id,
            email: profile.email,
            role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
            name: profile.name ?? profile.email, // Ensure name is always a string, fallback to email
          });
          setIsAuthenticated(true);
          setIsLoadingAuth(false); // Set loading to false after successful auth
        }
      } else {
        // This block handles SIGNED_OUT, INITIAL_SESSION (if no session), etc.
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false); // Set loading to false before navigating
        // Only navigate to login if the event is explicitly SIGNED_OUT
        // or if it's an initial session check and there's no session.
        if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
          navigate('/login', { replace: true });
        }
      }
      // Removed redundant setIsLoadingAuth(false) here, as it's handled inside if/else
    });

    // Check initial session on mount
    const checkInitialSession = async () => {
      try {
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
            setIsLoadingAuth(false); // Set loading to false before navigating
            navigate('/login', { replace: true });
          } else if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              role: profile.role as 'Admin' | 'Manager' | 'Staff' | 'Viewer',
              name: profile.name ?? profile.email, // Ensure name is always a string, fallback to email
            });
            setIsAuthenticated(true);
            setIsLoadingAuth(false); // Set loading to false after successful auth
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false); // Set loading to false before navigating
          navigate('/login', { replace: true }); // Navigate to login if no initial session
        }
      } catch (err) {
        console.error("Error during initial session check:", err);
        setUser(null);
        setIsAuthenticated(false);
        showError('An unexpected error occurred during authentication.');
        setIsLoadingAuth(false); // Ensure loading is false even on unexpected errors
        navigate('/login', { replace: true }); // Navigate to login on unexpected errors
      }
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
          name: profile.name ?? profile.email, // Ensure name is always a string, fallback to email
        });
        setIsAuthenticated(true);
        showSuccess('Login successful! Redirecting...');
        setIsLoadingAuth(false); // Set loading to false after successful login and profile fetch
        navigate('/dashboard', { replace: true });
      }
    }
    // Removed redundant setIsLoadingAuth(false) here, as it's handled inside if/else
  };

  const logout = async () => {
    setIsLoadingAuth(true); // Indicate loading while signing out
    const { error } = await supabase.auth.signOut();

    if (error) {
      showError(error.message);
      setIsLoadingAuth(false); // If sign out itself fails, stop loading
      throw error;
    }
    showSuccess('Logged out successfully.');
    // The onAuthStateChange listener will now handle setting isAuthenticated/user to null
    // and navigating to /login when it receives the 'SIGNED_OUT' event.
    // No need to call navigate('/login') or set state here directly.
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
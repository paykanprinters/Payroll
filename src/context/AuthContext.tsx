"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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

  // Use a ref to track the previous isLoadingAuth state to avoid logging on every render
  const prevIsLoadingAuthRef = useRef(true);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    
    const handleAuthStateChange = async (event: string, session: any | null) => {
      console.groupCollapsed(`AuthContext: handleAuthStateChange - Event: ${event}`);
      console.log("Raw session:", session);
      console.log("Current isMounted:", isMounted);

      if (!isMounted) {
        console.log("Component unmounted, skipping state update.");
        console.groupEnd();
        return;
      }

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
              console.log("Redirecting to /login due to SIGNED_OUT or no initial session.");
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
          // Only set to false if it's not already false.
          if (isLoadingAuth) { // Check current state
            setIsLoadingAuth(false);
            console.log("AuthContext: Setting isLoadingAuth to false in finally block.");
          }
        }
      }
      console.groupEnd();
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check (runs once on mount)
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.groupCollapsed("AuthContext: Initial session check.");
      console.log("Initial session:", session);
      if (isMounted) {
        if (session) {
          // If session exists, handleAuthStateChange would have already processed it
          // or will process it shortly via 'INITIAL_SESSION' event.
          // We just ensure isLoadingAuth is set correctly.
          if (isLoadingAuth) { // Check current state
            setIsLoadingAuth(false);
            console.log("Initial session found, setting isLoadingAuth to false.");
          }
        } else {
          // No initial session, ensure state is cleared and redirect if needed
          if (isAuthenticated) { // Check current state
            setIsAuthenticated(false);
            setUser(null);
            console.log("No initial session, clearing auth state.");
          }
          if (isLoadingAuth) { // Check current state
            setIsLoadingAuth(false);
            console.log("No initial session, setting isLoadingAuth to false.");
          }
          // handleAuthStateChange with 'INITIAL_SESSION' event will handle the redirect
        }
      }
      console.groupEnd();
    }).catch(err => {
      console.error("AuthContext: Error during initial getSession:", err);
      if (isMounted) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
        showError('Failed to check initial session. Please try logging in.');
        navigate('/login', { replace: true });
      }
    });

    return () => {
      isMounted = false; // Cleanup: component is unmounted
      authListener.subscription.unsubscribe();
      console.log("AuthContext: Auth listener unsubscribed.");
    };
  }, [navigate]); // Removed isLoadingAuth, isAuthenticated from dependencies

  // Log when isLoadingAuth changes
  useEffect(() => {
    if (prevIsLoadingAuthRef.current !== isLoadingAuth) {
      console.log(`AuthContext: isLoadingAuth changed from ${prevIsLoadingAuthRef.current} to ${isLoadingAuth}.`);
      prevIsLoadingAuthRef.current = isLoadingAuth;
    }
  }, [isLoadingAuth]);


  const login = async (email: string, password: string) => {
    setIsLoadingAuth(true); // Set loading true during login attempt
    try {
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
    } finally {
      // The onAuthStateChange listener will eventually set isLoadingAuth to false
      // based on the new session. We don't set it here directly to avoid race conditions.
    }
  };

  const logout = async () => {
    setIsLoadingAuth(true); // Set loading true during logout attempt
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        showError(error.message);
        throw error;
      }
      showSuccess('Logged out successfully.');
    } finally {
      // The onAuthStateChange listener will eventually set isLoadingAuth to false
      // based on the new session (or lack thereof).
    }
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
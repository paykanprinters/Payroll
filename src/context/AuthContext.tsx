"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type UserShape = {
  id: string;
  email?: string;
  name?: string;
  role?: string | null;
} | null;

type AuthState = {
  // Existing fields
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  role: string | null;
  // New fields (expected by various parts of the app)
  isLoadingAuth: boolean;
  user: UserShape;
};

const AuthContext = createContext<AuthState>({
  loading: true,
  isLoadingAuth: true,
  isAuthenticated: false,
  userId: null,
  role: null,
  user: null,
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<UserShape>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;
      const meta = (u?.user_metadata as any) ?? {};
      const nextRole = meta?.role ?? null;
      setUserId(u?.id ?? null);
      setRole(nextRole);
      setUser(u ? { id: u.id, email: u.email ?? undefined, name: meta?.name ?? undefined, role: nextRole } : null);
      setLoading(false);
    };
    init();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      const meta = (u?.user_metadata as any) ?? {};
      const nextRole = meta?.role ?? null;
      setUserId(u?.id ?? null);
      setRole(nextRole);
      setUser(u ? { id: u.id, email: u.email ?? undefined, name: meta?.name ?? undefined, role: nextRole } : null);
    });
    return () => { subscription.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthState>(() => ({
    loading,
    isLoadingAuth: loading,
    isAuthenticated: !!userId,
    userId,
    role,
    user,
  }), [loading, userId, role, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
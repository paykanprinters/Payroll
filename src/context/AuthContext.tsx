"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  role: string | null;
};

const AuthContext = createContext<AuthState>({
  loading: true,
  isAuthenticated: false,
  userId: null,
  role: null,
});

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUserId(session?.user?.id ?? null);
      setRole((session?.user?.user_metadata as any)?.role ?? null);
      setLoading(false);
    };
    init();
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
      setRole((session?.user?.user_metadata as any)?.role ?? null);
    });
    return () => { subscription.subscription.unsubscribe(); };
  }, []);

  const value = useMemo<AuthState>(() => ({
    loading,
    isAuthenticated: !!userId,
    userId,
    role,
  }), [loading, userId, role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
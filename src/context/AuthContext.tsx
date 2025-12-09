"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserShape = {
  id: string;
  email?: string;
  name?: string;
  role?: string | null;
} | null;

type AuthState = {
  loading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  role: string | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [user, setUser] = useState<UserShape>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user ?? null;

      if (u) {
        setUserId(u.id);
        // Get verified role from public.users (RLS ensures only own record)
        const { data: profile } = await supabase
          .from("users")
          .select("role, name")
          .eq("id", u.id)
          .single();

        const verifiedRole = profile?.role ?? null;
        const displayName =
          (u.user_metadata as any)?.name ??
          profile?.name ??
          undefined;

        setRole(verifiedRole);
        setUser({ id: u.id, email: u.email ?? undefined, name: displayName, role: verifiedRole });
      } else {
        setUserId(null);
        setRole(null);
        setUser(null);
      }

      setLoading(false);
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null;

      if (u) {
        setUserId(u.id);
        const { data: profile } = await supabase
          .from("users")
          .select("role, name")
          .eq("id", u.id)
          .single();

        const verifiedRole = profile?.role ?? null;
        const displayName =
          (u.user_metadata as any)?.name ??
          profile?.name ??
          undefined;

        setRole(verifiedRole);
        setUser({ id: u.id, email: u.email ?? undefined, name: displayName, role: verifiedRole });
      } else {
        setUserId(null);
        setRole(null);
        setUser(null);
      }
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
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
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const u = session?.user ?? null;

        if (!u) {
          setUserId(null);
          setRole(null);
          setUser(null);
          return;
        }

        setUserId(u.id);

        // Read verified role from public.users; tolerate missing rows
        const { data: profile, error: profileErr } = await supabase
          .from("users")
          .select("role, name")
          .eq("id", u.id)
          .maybeSingle();

        const verifiedRole = profile?.role ?? null;
        const displayName =
          (u.user_metadata as any)?.name ??
          profile?.name ??
          undefined;

        setRole(verifiedRole);
        setUser({ id: u.id, email: u.email ?? undefined, name: displayName, role: verifiedRole });

        if (profileErr) {
          // Log and continue; do not block routing
          console.warn("AuthProvider: profile read warning:", profileErr);
        }
      } catch (err) {
        console.error("AuthProvider: init session error:", err);
        // Fall through to ensure loading clears
        setUserId(null);
        setRole(null);
        setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const u = session?.user ?? null;

        if (!u) {
          setUserId(null);
          setRole(null);
          setUser(null);
          return;
        }

        setUserId(u.id);

        const { data: profile, error: profileErr } = await supabase
          .from("users")
          .select("role, name")
          .eq("id", u.id)
          .maybeSingle();

        const verifiedRole = profile?.role ?? null;
        const displayName =
          (u.user_metadata as any)?.name ??
          profile?.name ??
          undefined;

        setRole(verifiedRole);
        setUser({ id: u.id, email: u.email ?? undefined, name: displayName, role: verifiedRole });

        if (profileErr) {
          console.warn("AuthProvider: profile update warning:", profileErr);
        }
      } catch (err) {
        console.error("AuthProvider: auth state error:", err);
        setUserId(null);
        setRole(null);
        setUser(null);
      } finally {
        // Ensure we never get stuck in loading after auth events
        setLoading(false);
      }
    });

    // Safety: hard stop loading after 3s if something stalls
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 3000);

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.subscription.unsubscribe();
    };
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
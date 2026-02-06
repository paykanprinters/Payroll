"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "Admin" | "Manager" | "Staff" | "Viewer";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
});
AuthContext.displayName = "AuthContext";

export const useAuth = () => useContext(AuthContext);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        window.clearTimeout(id);
        resolve(value);
      })
      .catch((err) => {
        window.clearTimeout(id);
        reject(err);
      });
  });
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Debounce/guard refresh cycles
  const isRefreshingRef = useRef<boolean>(false);
  const lastRefreshTsRef = useRef<number>(0);

  const buildAuthUserFromSession = useCallback((sessionUser: any): AuthUser => {
    const email = (sessionUser?.email as string) || "";
    const meta = (sessionUser?.user_metadata || {}) as any;
    const role = (meta?.role || "Staff") as UserRole;
    const name = (meta?.name || meta?.full_name || email) as string;

    return {
      id: sessionUser.id,
      email,
      role,
      name,
    };
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", userId)
      .maybeSingle();

    if (error || !profile) return null;

    const authUser: AuthUser = {
      id: profile.id,
      email: profile.email as string,
      role: (profile.role || "Staff") as UserRole,
      name: (profile.name as string) ?? (profile.email as string),
    };

    return authUser;
  }, []);

  const redirectAfterLogin = useCallback(() => {
    const onAuthPages = location.pathname === "/login" || location.pathname === "/employee";
    if (!onAuthPages) return;
    navigate("/dashboard", { replace: true });
  }, [location.pathname, navigate]);

  const refreshSession = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      const now = Date.now();
      const silent = !!opts?.silent;
      const force = !!opts?.force;
      const MIN_REFRESH_INTERVAL_MS = 60000;

      if (isRefreshingRef.current) return;
      if (!force && now - lastRefreshTsRef.current < MIN_REFRESH_INTERVAL_MS) return;

      isRefreshingRef.current = true;
      if (!silent) setIsLoadingAuth(true);

      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 12000, "supabase.auth.getSession");
        const session = data.session;

        if (!session) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        const dbProfile = await withTimeout(fetchProfile(session.user.id), 12000, "fetchProfile");
        setUser(dbProfile ?? buildAuthUserFromSession(session.user));
        setIsAuthenticated(true);
      } catch (err: any) {
        // Important: do NOT block login UX if session check fails.
        console.error("AuthContext: refreshSession failed", { message: err?.message, err });
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (!silent) setIsLoadingAuth(false);
        isRefreshingRef.current = false;
        lastRefreshTsRef.current = Date.now();
      }
    },
    [buildAuthUserFromSession, fetchProfile]
  );

  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: any | null) => {
      console.groupCollapsed(`AuthContext: onAuthStateChange event: ${event}`);
      try {
        if (!session) {
          setUser(null);
          setIsAuthenticated(false);
          if (event === "SIGNED_OUT" && location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
          return;
        }

        const dbProfile = await fetchProfile(session.user.id);
        setUser(dbProfile ?? buildAuthUserFromSession(session.user));
        setIsAuthenticated(true);

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          redirectAfterLogin();
        }
      } catch (err: any) {
        console.error("AuthContext: Error handling auth change", { message: err?.message, err });
        setUser(null);
        setIsAuthenticated(false);
        if (location.pathname !== "/login") navigate("/login", { replace: true });
      } finally {
        setIsLoadingAuth(false);
      }
      console.groupEnd();
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check: do NOT show a blocking error if this fails.
    withTimeout(supabase.auth.getSession(), 12000, "initial supabase.auth.getSession")
      .then(async ({ data: { session } }) => {
        if (session) {
          const dbProfile = await fetchProfile(session.user.id);
          setUser(dbProfile ?? buildAuthUserFromSession(session.user));
          setIsAuthenticated(true);
          redirectAfterLogin();
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      })
      .catch((err: any) => {
        console.warn("AuthContext: Initial session check failed; continuing unauthenticated.", {
          message: err?.message,
        });
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
      });

    return () => {
      authListener.subscription.unsubscribe();
      console.log("AuthContext: Unsubscribed auth listener.");
    };
  }, [buildAuthUserFromSession, fetchProfile, location.pathname, navigate, redirectAfterLogin]);

  useEffect(() => {
    const focusHandler = () => refreshSession({ silent: true });
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") refreshSession({ silent: true });
    };
    window.addEventListener("focus", focusHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      window.removeEventListener("focus", focusHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, [refreshSession]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
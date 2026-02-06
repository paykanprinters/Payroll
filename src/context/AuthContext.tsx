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
import { showError } from "@/utils/toast";

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

  const prevIsLoadingAuthRef = useRef<boolean>(true);

  // Debounce/guard refresh cycles
  const isRefreshingRef = useRef<boolean>(false);
  const lastRefreshTsRef = useRef<number>(0);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data: profile, error } = await supabase
      .from("users")
      .select("id, email, name, role")
      .eq("id", userId)
      .single();

    if (error || !profile) return null;

    // Admin allowlist bootstrap (kept as-is)
    const ADMIN_ALLOWLIST = ["info@kanprinters.co.za"];
    let role: UserRole = (profile.role || "Staff") as UserRole;
    const email = profile.email as string;

    if (ADMIN_ALLOWLIST.includes(email) && role !== "Admin") {
      try {
        const { error: fnError } = await supabase.functions.invoke("bootstrap-admins", {
          body: JSON.stringify({ emails: ADMIN_ALLOWLIST }),
        });
        if (!fnError) {
          const { data: refreshed, error: refErr } = await supabase
            .from("users")
            .select("id, email, name, role")
            .eq("id", userId)
            .single();
          if (!refErr && refreshed) {
            role = (refreshed.role || "Staff") as UserRole;
          }
        }
      } catch (e) {
        console.error("AuthContext: bootstrap-admins exception", e);
      }
    }

    const authUser: AuthUser = {
      id: profile.id,
      email,
      role,
      name: profile.name ?? profile.email,
    };
    return authUser;
  }, []);

  const redirectAfterLogin = useCallback(() => {
    // If user is on an auth screen and becomes authenticated, send them to the app.
    const onAuthPages = location.pathname === "/login" || location.pathname === "/employee";
    if (!onAuthPages) return;
    navigate("/dashboard", { replace: true });
  }, [location.pathname, navigate]);

  const refreshSession = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      // Throttle rapid focus/visibility changes and prevent concurrent refreshes
      const now = Date.now();
      const silent = !!opts?.silent;
      const force = !!opts?.force;
      const MIN_REFRESH_INTERVAL_MS = 60000;

      if (isRefreshingRef.current) {
        console.log("AuthContext: refreshSession skipped (already refreshing).");
        return;
      }
      if (!force && now - lastRefreshTsRef.current < MIN_REFRESH_INTERVAL_MS) {
        console.log("AuthContext: refreshSession skipped (throttled).");
        return;
      }

      isRefreshingRef.current = true;
      if (!silent) setIsLoadingAuth(true);
      console.log("AuthContext: refreshSession invoked.", { silent, force });

      try {
        const { data } = await withTimeout(supabase.auth.getSession(), 8000, "supabase.auth.getSession");
        const session = data.session;

        if (session) {
          const authUser = await withTimeout(fetchProfile(session.user.id), 8000, "fetchProfile");
          if (authUser) {
            setUser(authUser);
            setIsAuthenticated(true);
          } else {
            console.warn("AuthContext: Profile missing; clearing auth.");
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          console.log("AuthContext: No session; clearing auth.");
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("AuthContext: refreshSession failed", err);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        if (!silent) setIsLoadingAuth(false);
        isRefreshingRef.current = false;
        lastRefreshTsRef.current = Date.now();
      }
    },
    [fetchProfile]
  );

  useEffect(() => {
    const handleAuthStateChange = async (event: string, session: any | null) => {
      console.groupCollapsed(`AuthContext: onAuthStateChange event: ${event}`);
      try {
        if (session) {
          const authUser = await fetchProfile(session.user.id);
          if (authUser) {
            setUser(authUser);
            setIsAuthenticated(true);

            if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
              redirectAfterLogin();
            }
          } else {
            setUser(null);
            setIsAuthenticated(false);
            showError("Failed to load user profile. Please try logging in again.");
            if (location.pathname !== "/login") navigate("/login", { replace: true });
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
          if (event === "SIGNED_OUT" && location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        }
      } catch (err) {
        console.error("AuthContext: Error handling auth change:", err);
        setUser(null);
        setIsAuthenticated(false);
        showError("Authentication error occurred.");
        if (location.pathname !== "/login") navigate("/login", { replace: true });
      } finally {
        setIsLoadingAuth(false);
      }
      console.groupEnd();
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    withTimeout(supabase.auth.getSession(), 8000, "initial supabase.auth.getSession")
      .then(async ({ data: { session } }) => {
        if (session) {
          const authUser = await withTimeout(fetchProfile(session.user.id), 8000, "initial fetchProfile");
          if (authUser) {
            setUser(authUser);
            setIsAuthenticated(true);
            redirectAfterLogin();
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }

        setIsLoadingAuth(false);
      })
      .catch((err) => {
        console.error("AuthContext: Initial session error:", err);
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
        showError("Failed to check session. Please log in.");
        if (location.pathname !== "/login") navigate("/login", { replace: true });
      });

    return () => {
      authListener.subscription.unsubscribe();
      console.log("AuthContext: Unsubscribed auth listener.");
    };
  }, [fetchProfile, navigate, location.pathname, redirectAfterLogin]);

  useEffect(() => {
    const focusHandler = () => {
      console.log("AuthContext: Window focus; refreshing session silently.");
      refreshSession({ silent: true });
    };
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        console.log("AuthContext: Tab visible; refreshing session silently.");
        refreshSession({ silent: true });
      }
    };
    window.addEventListener("focus", focusHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    let safetyTimer: number | undefined;
    if (isLoadingAuth) {
      safetyTimer = window.setTimeout(() => {
        console.warn("AuthContext: Safety timer triggered; forcing session refresh.");
        refreshSession({ force: true });
      }, 8000);
    }

    return () => {
      window.removeEventListener("focus", focusHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
      if (safetyTimer) window.clearTimeout(safetyTimer);
    };
  }, [isLoadingAuth, refreshSession]);

  useEffect(() => {
    if (prevIsLoadingAuthRef.current !== isLoadingAuth) {
      console.log(`AuthContext: isLoadingAuth changed from ${prevIsLoadingAuthRef.current} to ${isLoadingAuth}`);
      prevIsLoadingAuthRef.current = isLoadingAuth;
    }
  }, [isLoadingAuth]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoadingAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const navigate = useNavigate();
  const location = useLocation();

  const prevIsLoadingAuthRef = useRef<boolean>(true);
  const mountedRef = useRef<boolean>(false);

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

    const authUser: AuthUser = {
      id: profile.id,
      email: profile.email,
      role: (profile.role || "Staff") as UserRole,
      name: profile.name ?? profile.email,
    };
    return authUser;
  }, []);

  const refreshSession = useCallback(async () => {
    // Debounce rapid focus/visibility changes (2s window) and prevent concurrent refreshes
    const now = Date.now();
    if (isRefreshingRef.current) {
      console.log("AuthContext: refreshSession skipped (already refreshing).");
      return;
    }
    if (now - lastRefreshTsRef.current < 2000) {
      console.log("AuthContext: refreshSession skipped (debounced).");
      return;
    }

    isRefreshingRef.current = true;
    setIsLoadingAuth(true);
    console.log("AuthContext: refreshSession invoked.");

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const authUser = await fetchProfile(session.user.id);
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
    } finally {
      setIsLoadingAuth(false);
      isRefreshingRef.current = false;
      lastRefreshTsRef.current = Date.now();
    }
  }, [fetchProfile]);

  useEffect(() => {
    mountedRef.current = true;

    const handleAuthStateChange = async (event: string, session: any | null) => {
      console.groupCollapsed(`AuthContext: onAuthStateChange event: ${event}`);
      try {
        if (session) {
          const authUser = await fetchProfile(session.user.id);
          if (authUser) {
            setUser(authUser);
            setIsAuthenticated(true);

            const onAuthPages = location.pathname === "/login" || location.pathname === "/";
            if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && onAuthPages) {
              navigate("/dashboard", { replace: true });
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

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          const authUser = await fetchProfile(session.user.id);
          if (authUser) {
            setUser(authUser);
            setIsAuthenticated(true);
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }

        setIsLoadingAuth(false);

        const onAuthPages = location.pathname === "/login" || location.pathname === "/";
        if (session && onAuthPages) {
          navigate("/dashboard", { replace: true });
        }
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
      mountedRef.current = false;
      authListener.subscription.unsubscribe();
      console.log("AuthContext: Unsubscribed auth listener.");
    };
  }, [fetchProfile, navigate]);

  useEffect(() => {
    const focusHandler = () => {
      console.log("AuthContext: Window focus; refreshing session.");
      refreshSession();
    };
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        console.log("AuthContext: Tab visible; refreshing session.");
        refreshSession();
      }
    };
    window.addEventListener("focus", focusHandler);
    document.addEventListener("visibilitychange", visibilityHandler);

    let safetyTimer: number | undefined;
    if (isLoadingAuth) {
      safetyTimer = window.setTimeout(() => {
        console.warn("AuthContext: Safety timer triggered; forcing session refresh.");
        refreshSession();
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
      console.log(
        `AuthContext: isLoadingAuth changed from ${prevIsLoadingAuthRef.current} to ${isLoadingAuth}`
      );
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
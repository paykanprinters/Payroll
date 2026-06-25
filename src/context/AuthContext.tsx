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
import { isStaffPortalPath, STAFF_LOGIN_PATH, staffPortalPath } from "@/lib/staff-portal";
import { recordAuthEvent } from "@/lib/audit-trail";

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
  refreshAuth: (opts?: { silent?: boolean; force?: boolean }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  refreshAuth: async () => {},
});
AuthContext.displayName = "AuthContext";

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  const navigate = useNavigate();
  const location = useLocation();

  // Guard refresh cycles
  const isRefreshingRef = useRef<boolean>(false);
  const lastRefreshTsRef = useRef<number>(0);
  const userRef = useRef<AuthUser | null>(null);

  const buildAuthUserFromSession = useCallback((sessionUser: any): AuthUser => {
    const email = (sessionUser?.email as string) || "";
    const meta = (sessionUser?.user_metadata || {}) as any;
    // Never trust user_metadata.role for authorization — it is user-editable.
    const name = (meta?.name || meta?.full_name || email) as string;

    return {
      id: sessionUser.id,
      email,
      role: "Staff",
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
    const onAuthPages =
      location.pathname === "/login" ||
      location.pathname === "/employee" ||
      location.pathname === STAFF_LOGIN_PATH;

    if (!onAuthPages) return;

    if (location.pathname === STAFF_LOGIN_PATH || location.pathname === "/employee") {
      navigate(staffPortalPath(), { replace: true });
      return;
    }

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
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        const dbProfile = await fetchProfile(session.user.id);
        setUser(dbProfile ?? buildAuthUserFromSession(session.user));
        setIsAuthenticated(true);
      } catch (err: any) {
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
    const applySession = (sessionUser: { id: string; email?: string }, event?: string) => {
      void (async () => {
        setIsLoadingAuth(true);
        try {
          const dbProfile = await fetchProfile(sessionUser.id);
          const authUser = dbProfile ?? buildAuthUserFromSession(sessionUser);
          setUser(authUser);
          setIsAuthenticated(true);
          if (event === "SIGNED_IN") {
            void recordAuthEvent("signed_in", {
              userId: authUser.id,
              email: authUser.email,
              role: authUser.role,
              portal: isStaffPortalPath(location.pathname) ? "staff" : "admin",
            });
            redirectAfterLogin();
          } else if (event === "INITIAL_SESSION") {
            redirectAfterLogin();
          }
        } catch (err: unknown) {
          console.error("AuthContext: profile fetch failed", err);
          const fallbackUser = buildAuthUserFromSession(sessionUser);
          setUser(fallbackUser);
          setIsAuthenticated(true);
        } finally {
          setIsLoadingAuth(false);
        }
      })();
    };

    /**
     * Supabase auth holds an internal lock while this callback runs.
     * Never await other supabase calls here — defer them or sign-in stalls forever.
     */
    const handleAuthStateChange = (event: string, session: any | null) => {
      console.groupCollapsed(`AuthContext: onAuthStateChange event: ${event}`);
      try {
        if (!session) {
          if (event === "SIGNED_OUT") {
            const signedOutUser = userRef.current;
            if (signedOutUser) {
              void recordAuthEvent("signed_out", {
                userId: signedOutUser.id,
                email: signedOutUser.email,
                role: signedOutUser.role,
                portal: isStaffPortalPath(location.pathname) ? "staff" : "admin",
              });
            }
          }
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          if (event === "SIGNED_OUT") {
            const target = isStaffPortalPath(location.pathname) ? STAFF_LOGIN_PATH : "/login";
            if (location.pathname !== target) {
              navigate(target, { replace: true });
            }
          }
          return;
        }

        setTimeout(() => applySession(session.user, event), 0);
      } catch (err: unknown) {
        console.error("AuthContext: Error handling auth change", err);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        if (location.pathname !== "/login" && location.pathname !== STAFF_LOGIN_PATH) {
          navigate(isStaffPortalPath(location.pathname) ? STAFF_LOGIN_PATH : "/login", {
            replace: true,
          });
        }
      } finally {
        console.groupEnd();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check (best-effort)
    supabase.auth
      .getSession()
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
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Safety: never allow auth loading to block the app forever
    if (!isLoadingAuth) return;
    const t = window.setTimeout(() => {
      console.warn("AuthContext: Safety timeout reached; stopping auth loading UI.");
      setIsLoadingAuth(false);
    }, 8000);
    return () => window.clearTimeout(t);
  }, [isLoadingAuth]);

  useEffect(() => {
    // Only do silent refresh after initial auth is settled
    if (isLoadingAuth) return;

    const focusHandler = () => refreshSession({ silent: true });
    const visibilityHandler = () => {
      if (document.visibilityState === "visible") refreshSession({ silent: true });
    };
    const onlineHandler = () => refreshSession({ silent: true, force: true });

    window.addEventListener("focus", focusHandler);
    document.addEventListener("visibilitychange", visibilityHandler);
    window.addEventListener("online", onlineHandler);

    return () => {
      window.removeEventListener("focus", focusHandler);
      document.removeEventListener("visibilitychange", visibilityHandler);
      window.removeEventListener("online", onlineHandler);
    };
  }, [isLoadingAuth, refreshSession]);

  const value: AuthContextValue = {
    user,
    isAuthenticated,
    isLoadingAuth,
    refreshAuth: refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
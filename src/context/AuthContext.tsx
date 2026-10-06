"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isStaffPortalPath, STAFF_LOGIN_PATH, staffPortalPath } from "@/lib/staff-portal";
import { recordAuthEvent } from "@/lib/audit-trail";
import { AuthContext } from "@/context/auth-context-state";
import type { AuthContextValue, AuthUser, UserRole } from "@/context/auth-types";

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
  const pathnameRef = useRef(location.pathname);
  const navigateRef = useRef(navigate);

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
    const path = pathnameRef.current;
    const go = navigateRef.current;
    const onAuthPages =
      path === "/login" ||
      path === "/employee" ||
      path === STAFF_LOGIN_PATH;

    if (!onAuthPages) return;

    if (path === STAFF_LOGIN_PATH || path === "/employee") {
      go(staffPortalPath(), { replace: true });
      return;
    }

    go("/dashboard", { replace: true });
  }, []);

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
        if (!dbProfile) {
          console.warn("AuthContext: no users profile for authenticated session — signing out.");
          await supabase.auth.signOut();
          setUser(null);
          setIsAuthenticated(false);
          return;
        }
        setUser(dbProfile);
        setIsAuthenticated(true);
      } catch (err: unknown) {
        console.error("AuthContext: refreshSession failed", {
          message: err instanceof Error ? err.message : "Unknown error",
          err,
        });
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
    const applySession = (sessionUser: { id: string; email?: string }, event?: string) => {
      void (async () => {
        // A repeat session event (route change, token refresh) must not replace the page with a spinner.
        const blockUi = !userRef.current;
        if (blockUi) setIsLoadingAuth(true);
        try {
          const dbProfile = await fetchProfile(sessionUser.id);
          if (!dbProfile) {
            console.warn("AuthContext: no users profile — signing out.");
            await supabase.auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
            return;
          }
          setUser(dbProfile);
          setIsAuthenticated(true);
          if (event === "SIGNED_IN") {
            void recordAuthEvent("signed_in", {
              userId: dbProfile.id,
              email: dbProfile.email,
              role: dbProfile.role,
              portal: isStaffPortalPath(pathnameRef.current) ? "staff" : "admin",
            });
            redirectAfterLogin();
          } else if (event === "INITIAL_SESSION") {
            redirectAfterLogin();
          }
        } catch (err: unknown) {
          console.error("AuthContext: profile fetch failed", err);
          await supabase.auth.signOut();
          setUser(null);
          setIsAuthenticated(false);
        } finally {
          if (blockUi) setIsLoadingAuth(false);
        }
      })();
    };

    /**
     * Supabase auth holds an internal lock while this callback runs.
     * Never await other supabase calls here — defer them or sign-in stalls forever.
     */
    const handleAuthStateChange = (event: AuthChangeEvent, session: Session | null) => {
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
                portal: isStaffPortalPath(pathnameRef.current) ? "staff" : "admin",
              });
            }
          }
          setUser(null);
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          if (event === "SIGNED_OUT") {
            const path = pathnameRef.current;
            const target = isStaffPortalPath(path) ? STAFF_LOGIN_PATH : "/login";
            if (path !== target) {
              navigateRef.current(target, { replace: true });
            }
          }
          return;
        }

        if (event === "TOKEN_REFRESHED" && userRef.current?.id === session.user.id) {
          return;
        }

        setTimeout(() => applySession(session.user, event), 0);
      } catch (err: unknown) {
        console.error("AuthContext: Error handling auth change", err);
        setUser(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        const path = pathnameRef.current;
        if (path !== "/login" && path !== STAFF_LOGIN_PATH) {
          navigateRef.current(isStaffPortalPath(path) ? STAFF_LOGIN_PATH : "/login", {
            replace: true,
          });
        }
      } finally {
        console.groupEnd();
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check (best-effort) — must match applySession: no profile → sign out.
    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (session) {
          const dbProfile = await fetchProfile(session.user.id);
          if (!dbProfile) {
            console.warn("AuthContext: no users profile for initial session — signing out.");
            await supabase.auth.signOut();
            setUser(null);
            setIsAuthenticated(false);
          } else {
            setUser(dbProfile);
            setIsAuthenticated(true);
            redirectAfterLogin();
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setIsLoadingAuth(false);
      })
      .catch((err: unknown) => {
        console.warn("AuthContext: Initial session check failed; continuing unauthenticated.", {
          message: err instanceof Error ? err.message : "Unknown error",
        });
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
      });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile, redirectAfterLogin]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

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
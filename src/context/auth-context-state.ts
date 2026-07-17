import { createContext } from "react";
import type { AuthContextValue } from "@/context/auth-types";

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  refreshAuth: async () => {},
});

AuthContext.displayName = "AuthContext";

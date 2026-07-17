export type UserRole = "Admin" | "Manager" | "Staff" | "Viewer";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  refreshAuth: (opts?: { silent?: boolean; force?: boolean }) => Promise<void>;
}

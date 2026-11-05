export type UserRole = "Admin" | "Manager" | "Staff" | "Accountant";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  /** Accountant logins only: ISO timestamp after which payroll data is no longer readable. */
  accessExpiresAt?: string | null;
  status?: string | null;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  refreshAuth: (opts?: { silent?: boolean; force?: boolean }) => Promise<void>;
}

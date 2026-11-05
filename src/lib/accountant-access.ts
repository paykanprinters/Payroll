import type { AuthUser } from "@/context/auth-types";

export type AccountantAccessState = "active" | "inactive" | "expired";

/** Mirrors the account checks in the database function is_payroll_reader(). */
export function accountantAccessState(
  user: Pick<AuthUser, "status" | "accessExpiresAt">,
  now: Date = new Date()
): AccountantAccessState {
  if (user.status && user.status !== "Active") return "inactive";
  if (user.accessExpiresAt) {
    const expires = new Date(user.accessExpiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() <= now.getTime()) return "expired";
  }
  return "active";
}

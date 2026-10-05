import { describe, expect, it } from "vitest";
import { userDisplayName } from "@/lib/user-display";

describe("userDisplayName", () => {
  const directory = new Map([
    ["reviewer", { name: "Super Admin", email: "info@kanprinters.co.za" }],
    ["blank", { name: "   ", email: "manager@kanprinters.co.za" }],
  ]);

  it("uses the account name", () => {
    expect(userDisplayName("reviewer", directory)).toBe("Super Admin");
  });

  it("uses the email when the account has no name", () => {
    expect(userDisplayName("blank", directory)).toBe("manager@kanprinters.co.za");
  });

  it("leaves an empty actor blank", () => {
    expect(userDisplayName(null, directory)).toBe("—");
  });

  it("does not show the database id when the account is missing", () => {
    expect(userDisplayName("a508b0a2-4825-4843-8a21-bec59e209fdf", directory)).toBe("Unknown user");
  });
});

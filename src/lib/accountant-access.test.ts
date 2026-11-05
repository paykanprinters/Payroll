import { describe, expect, it } from "vitest";
import { accountantAccessState } from "./accountant-access";

const now = new Date("2026-11-03T10:00:00+02:00");

describe("accountantAccessState", () => {
  it("is active with no end date", () => {
    expect(accountantAccessState({ status: "Active", accessExpiresAt: null }, now)).toBe("active");
  });

  it("is active before the end date", () => {
    expect(
      accountantAccessState({ status: "Active", accessExpiresAt: "2026-11-30T23:59:59+02:00" }, now)
    ).toBe("active");
  });

  it("is expired once the end date has passed", () => {
    expect(
      accountantAccessState({ status: "Active", accessExpiresAt: "2026-11-02T23:59:59+02:00" }, now)
    ).toBe("expired");
  });

  it("is inactive when the login is deactivated", () => {
    expect(accountantAccessState({ status: "Inactive", accessExpiresAt: null }, now)).toBe("inactive");
  });
});

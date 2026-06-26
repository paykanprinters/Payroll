import { describe, expect, it } from "vitest";
import { toLogError } from "@/lib/logger";

describe("toLogError (COMP-15, POPIA-safe error messages)", () => {
  it("returns the message from an Error instance", () => {
    expect(toLogError(new Error("boom"))).toBe("boom");
  });

  it("returns a plain string as-is", () => {
    expect(toLogError("plain message")).toBe("plain message");
  });

  it("extracts message from a Supabase-style error object without leaking row data", () => {
    const supabaseError = {
      message: "duplicate key value violates unique constraint",
      details: "Key (id_number)=(8001015009087) already exists.",
      hint: "Employee Jane Doe, salary 50000",
      code: "23505",
    };
    const result = toLogError(supabaseError);
    expect(result).toBe("duplicate key value violates unique constraint");
    expect(result).not.toContain("8001015009087");
    expect(result).not.toContain("50000");
    expect(result).not.toContain("Jane");
  });

  it("falls back to error_description when message is absent", () => {
    expect(toLogError({ error_description: "token expired" })).toBe("token expired");
  });

  it("handles null/undefined and unexpected shapes safely", () => {
    expect(toLogError(null)).toBe("unknown error");
    expect(toLogError(undefined)).toBe("unknown error");
    expect(toLogError({ foo: "bar" })).toBe("unexpected error");
    expect(toLogError(42)).toBe("unexpected error");
  });
});

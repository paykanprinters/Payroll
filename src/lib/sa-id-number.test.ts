import { describe, it, expect } from "vitest";
import {
  isValidSaIdNumber,
  normalizeSaIdNumber,
  parseSaIdNumberDateOfBirth,
} from "@/lib/sa-id-number";

describe("sa-id-number", () => {
  it("normalizes spaces and non-digits", () => {
    expect(normalizeSaIdNumber("8001 0150 0908 7")).toBe("8001015009087");
  });

  it("parses birth date from a valid SA ID", () => {
    expect(parseSaIdNumberDateOfBirth("8001015009087")).toBe("1980-01-01");
    expect(parseSaIdNumberDateOfBirth("9001015000087")).toBe("1990-01-01");
    expect(parseSaIdNumberDateOfBirth("0501015000087")).toBe("2005-01-01");
  });

  it("rejects invalid embedded dates", () => {
    expect(parseSaIdNumberDateOfBirth("8013325009087")).toBeNull();
    expect(parseSaIdNumberDateOfBirth("12345")).toBeNull();
  });

  it("validates checksum for known valid IDs", () => {
    expect(isValidSaIdNumber("8001015009087")).toBe(true);
    expect(isValidSaIdNumber("8001015009088")).toBe(false);
  });

  it("still parses DOB when checksum is wrong but date digits are valid", () => {
    expect(parseSaIdNumberDateOfBirth("9001015000087")).toBe("1990-01-01");
    expect(isValidSaIdNumber("9001015000087")).toBe(false);
  });
});

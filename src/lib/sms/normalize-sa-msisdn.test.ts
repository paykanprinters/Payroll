import { describe, expect, it } from "vitest";
import { isValidSaMobile, normalizeSaMsisdn } from "@/lib/sms/normalize-sa-msisdn";

describe("normalizeSaMsisdn", () => {
  it("converts local 0-prefixed numbers to international", () => {
    expect(normalizeSaMsisdn("0822962062")).toBe("27822962062");
    expect(normalizeSaMsisdn("0745079171")).toBe("27745079171");
  });

  it("accepts already-international and +27 formats", () => {
    expect(normalizeSaMsisdn("27822962062")).toBe("27822962062");
    expect(normalizeSaMsisdn("+27 82 296 2062")).toBe("27822962062");
    expect(normalizeSaMsisdn("082-296-2062")).toBe("27822962062");
  });

  it("rejects invalid numbers", () => {
    expect(normalizeSaMsisdn("")).toBeNull();
    expect(normalizeSaMsisdn(undefined)).toBeNull();
    expect(normalizeSaMsisdn("12345")).toBeNull();
    expect(normalizeSaMsisdn("0123456789")).toBeNull(); // landline-style, not 6-8 prefix
    expect(normalizeSaMsisdn("0822962")).toBeNull(); // too short
  });

  it("isValidSaMobile mirrors normalization", () => {
    expect(isValidSaMobile("0822962062")).toBe(true);
    expect(isValidSaMobile("nope")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  formatResidentialAddress,
  shouldSyncPermanentAddress,
} from "@/lib/format-residential-address";

describe("formatResidentialAddress", () => {
  it("joins non-empty parts with commas", () => {
    expect(
      formatResidentialAddress({
        addressLine1: "1 Rust Court, Conrad Road,",
        addressLine2: "Daniel Ave, Ottery",
        city: "Cape Town",
        province: "Western Cape",
        postalCode: "7945",
      }),
    ).toBe("1 Rust Court, Conrad Road, Daniel Ave, Ottery, Cape Town, Western Cape, 7945");
  });

  it("trims and skips blanks", () => {
    expect(
      formatResidentialAddress({
        addressLine1: "  12 Main Rd  ",
        addressLine2: " ",
        city: "Durban",
        province: undefined,
        postalCode: "4001",
      }),
    ).toBe("12 Main Rd, Durban, 4001");
  });
});

describe("shouldSyncPermanentAddress", () => {
  it("syncs when permanent is empty", () => {
    expect(shouldSyncPermanentAddress("", "12 Main Rd, Durban", null)).toBe(true);
  });

  it("syncs when permanent still matches last auto-fill", () => {
    expect(shouldSyncPermanentAddress("12 Main Rd, Durban", "12 Main Rd, Durban, 4001", "12 Main Rd, Durban")).toBe(
      true,
    );
  });

  it("does not sync when user changed permanent to a different address", () => {
    expect(shouldSyncPermanentAddress("99 Other St, Pretoria", "12 Main Rd, Durban", "12 Main Rd, Durban")).toBe(
      false,
    );
  });
});

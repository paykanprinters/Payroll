import { describe, expect, it } from "vitest";
import { buildAnonymizedEmployeePayload } from "@/lib/popia/anonymize-employee";

describe("buildAnonymizedEmployeePayload", () => {
  const now = new Date("2026-06-29T10:00:00.000Z");
  const payload = buildAnonymizedEmployeePayload("emp-1", "admin-9", now);

  it("redacts identifying personal information", () => {
    expect(payload.email).toBeNull();
    expect(payload.phone_number).toBeNull();
    expect(payload.id_number).toBeNull();
    expect(payload.tax_reference_number).toBeNull();
    expect(payload.address_line1).toBeNull();
    expect(payload.bank_name).toBeNull();
    expect(payload.iban_number).toBeNull();
    expect(payload.routing_swift_code).toBeNull();
    expect(payload.date_of_birth).toBeNull();
    expect(payload.emergency_contact_name).toBeNull();
  });

  it("redacts special personal information (biometric/health)", () => {
    expect(payload.personal_id).toBeNull();
    expect(payload.medical_aid_member).toBe(false);
    expect(payload.medical_aid_dependants).toBeNull();
  });

  it("replaces names with non-identifying placeholders", () => {
    expect(payload.first_name).toBe("Redacted");
    expect(payload.last_name).toBe("Employee");
  });

  it("severs portal access and auth linkage", () => {
    expect(payload.portal_access).toBe(false);
    expect(payload.user_id).toBeNull();
  });

  it("stamps erasure metadata", () => {
    expect(payload.id).toBe("emp-1");
    expect(payload.anonymized_at).toBe("2026-06-29T10:00:00.000Z");
    expect(payload.anonymized_by).toBe("admin-9");
  });
});

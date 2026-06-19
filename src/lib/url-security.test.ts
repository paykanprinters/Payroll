import { describe, expect, it } from "vitest";
import { validateOutboundHttpUrl } from "@/lib/url-security";

describe("validateOutboundHttpUrl", () => {
  it("allows public biometric server URLs", () => {
    const result = validateOutboundHttpUrl("http://102.69.157.253:8000/logs");
    expect(result.ok).toBe(true);
  });

  it("blocks localhost", () => {
    expect(validateOutboundHttpUrl("http://127.0.0.1:8000/logs").ok).toBe(false);
    expect(validateOutboundHttpUrl("http://localhost/logs").ok).toBe(false);
  });

  it("blocks cloud metadata IP", () => {
    expect(validateOutboundHttpUrl("http://169.254.169.254/latest/meta-data").ok).toBe(false);
  });

  it("blocks credentials in URL", () => {
    expect(validateOutboundHttpUrl("http://user:pass@102.69.157.253/logs").ok).toBe(false);
  });
});

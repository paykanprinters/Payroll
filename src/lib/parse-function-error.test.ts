import { describe, expect, it } from "vitest";
import { parseFunctionError } from "@/lib/parse-function-error";

describe("parseFunctionError", () => {
  it("prefers structured data.error when present", async () => {
    await expect(parseFunctionError({ message: "Edge Function returned a non-2xx status code" }, { error: "Sender missing" })).resolves.toBe(
      "Sender missing"
    );
  });

  it("uses email-specific fallback only for email service hints", async () => {
    await expect(
      parseFunctionError({ message: "Edge Function returned a non-2xx status code" }, null, { service: "email" })
    ).resolves.toContain("email service");

    await expect(
      parseFunctionError({ message: "Edge Function returned a non-2xx status code" }, null, { service: "sms" })
    ).resolves.toContain("SMS service");

    await expect(
      parseFunctionError({ message: "Edge Function returned a non-2xx status code" }, null, { service: "generic" })
    ).resolves.toContain("server rejected");
  });
});

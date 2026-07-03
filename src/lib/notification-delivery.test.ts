import { describe, expect, it } from "vitest";
import {
  describeWelcomeDeliveryResult,
  formatWelcomeDeliverySummary,
  statusBadgeClass,
} from "./notification-delivery";

describe("notification-delivery", () => {
  it("describes known welcome result codes", () => {
    expect(describeWelcomeDeliveryResult("sent")).toContain("success");
    expect(describeWelcomeDeliveryResult("skipped_no_email")).toContain("email");
  });

  it("formats a combined summary", () => {
    const summary = formatWelcomeDeliverySummary({
      email: "skipped_no_email",
      sms: "sent",
    });
    expect(summary).toContain("Email:");
    expect(summary).toContain("SMS:");
  });

  it("styles statuses", () => {
    expect(statusBadgeClass("sent")).toContain("emerald");
    expect(statusBadgeClass("skipped")).toContain("amber");
    expect(statusBadgeClass("failed")).toContain("destructive");
  });
});

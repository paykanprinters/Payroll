import { describe, expect, it } from "vitest";
import { buildReportPrintDocumentHtml } from "@/lib/report-print-html";
import { DEFAULT_REPORT_DESIGN_SETTINGS } from "@/lib/report-design-interfaces";

describe("buildReportPrintDocumentHtml", () => {
  it("embeds title, sanitized body, and oriented page size", () => {
    const html = buildReportPrintDocumentHtml({
      reportTitle: "Payroll readiness",
      reportContentHtml: "<p>Hello <strong>world</strong></p><script>alert(1)</script>",
      companyDetails: {
        companyLegalName: "Kan Screenprinters cc",
        companyTradingName: "Kan Printers",
        physicalAddress: "1 Test St",
        companyRegistrationNumber: "123",
        vatRegistrationNumber: "456",
        mainContactNumber: "021",
        companyEmail: "a@b.co.za",
        companyWebsite: "https://example.com",
      },
      reportDesignSettings: DEFAULT_REPORT_DESIGN_SETTINGS,
      orientation: "landscape",
    });

    expect(html).toContain("Payroll readiness");
    expect(html).toContain("Kan Screenprinters cc");
    expect(html).toContain("Hello");
    expect(html).not.toContain("<script>");
    expect(html).toContain("size: a4 landscape");
    expect(html).toContain("297mm");
  });
});

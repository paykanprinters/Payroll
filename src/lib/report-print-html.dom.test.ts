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
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("size: a4 landscape");
    expect(html).toContain('id="sheets"');
    expect(html).toContain("border-radius:");
    expect(html).toContain("__REPORT_PAGINATED__");
  });

  it("applies Report Design page chrome settings", () => {
    const html = buildReportPrintDocumentHtml({
      reportTitle: "Chrome check",
      reportContentHtml: "<p>Body</p>",
      companyDetails: null,
      reportDesignSettings: {
        ...DEFAULT_REPORT_DESIGN_SETTINGS,
        showPageBorder: true,
        pageBorderRadiusPx: 20,
        pageSheetInsetMm: 12,
        pageContentPaddingMm: 10,
        pageBorderWidthPx: 2.5,
      },
    });

    expect(html).toContain("border-radius: 20px");
    expect(html).toContain("padding: 10mm");
    expect(html).toContain("margin: 12mm");
    expect(html).toContain("2.5px solid #94a3b8");
  });

  it("omits sheet border when showPageBorder is false", () => {
    const html = buildReportPrintDocumentHtml({
      reportTitle: "No border",
      reportContentHtml: "<p>Body</p>",
      companyDetails: null,
      reportDesignSettings: {
        ...DEFAULT_REPORT_DESIGN_SETTINGS,
        showPageBorder: false,
      },
    });

    expect(html).toContain("border: none");
  });
});

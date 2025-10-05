export interface ReportDesignSettings {
  defaultReportPaperSize: "Letter" | "A4" | "A5";
  includeCompanyLogo: boolean;
  includeCompanyDetails: boolean;
  reportContentFontSize: number;
  irp5ContentFontSize: number; // New field for IRP5 specific font size
}
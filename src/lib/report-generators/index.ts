export type { MockEmployee, MockPayslip, LeaveEntry } from "../mock-data-interfaces";

export { generatePayrollSummaryReportContent } from "./payroll-summary";
export { generateEmployeePayslipReportContent } from "./employee-payslip";
export { generateTaxStatutoryReportContent } from "./tax-statutory";
export { generateEmp201ReportContent, computeEmp201Totals } from "./emp201";
export type { Emp201Totals } from "./emp201";
export {
  generateEmp501ReportContent,
  computeEmp501Reconciliation,
} from "./emp501";
export type {
  Emp501Reconciliation,
  Emp501MonthlyLine,
  Emp501CertificateTotals,
  Emp501ReconciliationLine,
} from "./emp501";
export { generateLeaveAbsenceReportContent } from "./leave-absence";
export { generateOvertimeBonusReportContent } from "./overtime-bonus";
export { generateDepartmentalCostReportContent } from "./departmental-cost";
export { generateBankTransferReportContent } from "./bank-transfer";
export { generateNewHiresTerminationsReportContent } from "./new-hires-terminations";
export { generateEmployeeDemographicsReportContent } from "./employee-demographics";
export { generateBenefitDeductionsReportContent } from "./benefit-deductions";
export { generateAuditTrailReportContent } from "./audit-trail";
export { generateEmployeeProfileReportContent } from "./employee-profile";
export { generateIrp5ExportContent, renderIrp5CertificateHtml } from "./irp5-export";
export {
  buildEasyFileExport,
  serializeEasyFileCsv,
  generateEasyFileCsv,
  escapeCsvField,
  easyFileExportFilename,
  EASYFILE_COLUMNS,
} from "./easyfile-export";
export type {
  EasyFileExport,
  EasyFileRow,
  EasyFileColumn,
  EasyFileSkippedEmployee,
} from "./easyfile-export";
export {
  validateEasyFileExport,
  validateEasyFileCsvStructure,
  mergeEasyFileValidation,
  isValidPayeReference,
  isValidIncomeTaxReference,
} from "./easyfile-validation";
export type {
  EasyFileValidationIssue,
  EasyFileValidationReport,
} from "./easyfile-validation";
export {
  buildEmployeeTaxCertificate,
  buildIrp5Certificate,
  determineEmployeeTaxCertificateType,
  getEmployeeTaxCertificateLabel,
  validateIrp5CertificateInputs,
  generateEmployeeTaxCertificateNumber,
  generateIrp5CertificateNumber,
  IRP5_SOURCE_CODES,
} from "@/lib/irp5-certificate";
export type {
  EmployeeTaxCertificateType,
  Irp5Certificate,
  Irp5SourceCodeLine,
  Irp5ValidationIssue,
} from "@/lib/irp5-certificate";
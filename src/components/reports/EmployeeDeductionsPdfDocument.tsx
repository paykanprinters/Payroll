"use client";

import React from "react";
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import type { EmployeeDeductionsReport } from "@/lib/report-generators/employee-deductions";
import { resolveCompanyLogoSource, resolveReportLogoDimensions } from "@/lib/document-logo";

const styles = StyleSheet.create({
  page: { paddingTop: 40, paddingBottom: 48, paddingHorizontal: 44, fontSize: 9, color: "#0f172a" },
  sheet: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    bottom: 16,
    borderWidth: 1,
    borderColor: "#94a3b8",
    borderRadius: 10,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  companyInfo: { alignItems: "flex-end", fontSize: 8.5, lineHeight: 1.35 },
  companyName: { fontSize: 11, fontWeight: 700, marginBottom: 2 },
  rule: { height: 1, backgroundColor: "#e2e8f0", marginTop: 8, marginBottom: 12 },
  title: { fontSize: 13, fontWeight: 700, textAlign: "center", marginBottom: 12 },
  banner: {
    padding: 8,
    marginBottom: 8,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fdba74",
    borderRadius: 6,
    color: "#9a3412",
    fontSize: 8.5,
  },
  periodBox: {
    padding: 9,
    marginBottom: 10,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  muted: { color: "#64748b" },
  bold: { fontWeight: 700 },
  paragraph: { marginBottom: 6 },
  table: { marginTop: 8 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  cell: { paddingVertical: 5, paddingRight: 4 },
  headerCell: { fontWeight: 700 },
  footer: {
    marginTop: 18,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    fontSize: 7.5,
    color: "#64748b",
  },
  pageNumber: { position: "absolute", bottom: 24, right: 44, fontSize: 7.5, color: "#94a3b8" },
});

const COLUMNS: { label: string; width: string }[] = [
  { label: "Employee", width: "15%" },
  { label: "Payslips", width: "6.5%" },
  { label: "Gross", width: "8.5%" },
  { label: "PAYE", width: "7%" },
  { label: "UIF", width: "6.5%" },
  { label: "Loan\nrepayments", width: "8.5%" },
  { label: "Savings", width: "7%" },
  { label: "Other\ndeductions", width: "7.5%" },
  { label: "Total\ndeductions", width: "8%" },
  { label: "Net pay", width: "8.5%" },
  { label: "Loan\nbalance", width: "8%" },
  { label: "Savings\nbalance", width: "9%" },
];

const money = (n: number) =>
  n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/\s/g, "\u00a0");
const balance = (n: number | null) => (n == null ? "—" : money(n));

const Row: React.FC<{ cells: string[]; header?: boolean; bold?: boolean; fixed?: boolean }> = ({
  cells,
  header,
  bold,
  fixed,
}) => (
  <View style={styles.row} wrap={false} fixed={fixed}>
    {cells.map((value, i) => (
      <Text key={i} style={[styles.cell, { width: COLUMNS[i].width }, header || bold ? styles.headerCell : {}]}>
        {value}
      </Text>
    ))}
  </View>
);

type Props = {
  report: EmployeeDeductionsReport;
  periodLabel: string;
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  generatedAt?: Date;
};

/** Same layout as the "Employee deductions for the accountant" report on the Reports page. */
const EmployeeDeductionsPdfDocument: React.FC<Props> = ({
  report,
  periodLabel,
  companyDetails,
  reportDesignSettings,
  generatedAt = new Date(),
}) => {
  const companyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "";
  const logoSrc = reportDesignSettings.includeCompanyLogo ? resolveCompanyLogoSource(companyDetails?.logoUrl) : undefined;
  const logoDims = resolveReportLogoDimensions(reportDesignSettings, companyDetails);
  const t = report.totals;
  const pageSize = reportDesignSettings.defaultReportPaperSize === "Letter" ? "LETTER" : reportDesignSettings.defaultReportPaperSize;

  return (
    <Document title="Employee deductions for the accountant">
      <Page size={pageSize} orientation="landscape" style={styles.page}>
        <View style={styles.sheet} fixed />

        {(reportDesignSettings.includeCompanyDetails || logoSrc) && (
          <View style={styles.headerRow}>
            <View>
              {logoSrc && (
                <Image src={logoSrc} style={{ width: logoDims.width, height: logoDims.height, objectFit: "contain" }} />
              )}
            </View>
            {reportDesignSettings.includeCompanyDetails && (
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{companyName}</Text>
                {!!companyDetails?.companyTradingName && companyDetails.companyTradingName !== companyName && (
                  <Text>{companyDetails.companyTradingName}</Text>
                )}
                {!!companyDetails?.physicalAddress && <Text>{companyDetails.physicalAddress}</Text>}
                {!!companyDetails?.companyRegistrationNumber && <Text>{`Reg. No: ${companyDetails.companyRegistrationNumber}`}</Text>}
                {!!companyDetails?.vatRegistrationNumber && <Text>{`VAT No: ${companyDetails.vatRegistrationNumber}`}</Text>}
                {!!companyDetails?.mainContactNumber && <Text>{`Tel: ${companyDetails.mainContactNumber}`}</Text>}
                {!!companyDetails?.companyEmail && <Text>{`Email: ${companyDetails.companyEmail}`}</Text>}
                {!!companyDetails?.companyWebsite && <Text>{`Web: ${companyDetails.companyWebsite}`}</Text>}
              </View>
            )}
          </View>
        )}
        <View style={styles.rule} />

        <Text style={styles.title}>Employee deductions for the accountant</Text>

        <View style={styles.banner}>
          <Text>
            <Text style={styles.bold}>Confidential</Text>
            {" — contains employee payment and banking details. Handle according to your data protection policy."}
          </Text>
        </View>

        <View style={styles.periodBox}>
          <Text>
            <Text style={styles.bold}>Reporting period: </Text>
            {periodLabel}
          </Text>
          <Text style={[styles.muted, { marginTop: 3 }]}>{`Generated ${generatedAt.toLocaleString("en-ZA")}`}</Text>
        </View>

        <Text style={styles.paragraph}>
          {`PAYE, UIF, loan repayments and savings deducted from each employee's payslips for ${report.periodDescription}.`}
        </Text>
        <Text style={styles.paragraph}>
          {
            'Amounts in rand. Balances are as at each employee\'s last payslip in the period; "—" means that payslip was generated before balances were recorded. Employer SDL is not deducted from employees and is not shown.'
          }
        </Text>

        <View style={styles.table}>
          <Row cells={COLUMNS.map((c) => c.label)} header fixed />
          {report.rows.map((r) => (
            <Row
              key={r.employeeId}
              cells={[
                r.name,
                String(r.payslipCount),
                money(r.gross),
                money(r.paye),
                money(r.uif),
                money(r.loan),
                money(r.savings),
                money(r.otherDeductions),
                money(r.totalDeductions),
                money(r.net),
                balance(r.loanBalance),
                balance(r.savingsBalance),
              ]}
            />
          ))}
          <Row
            bold
            cells={[
              "Total",
              String(t.payslipCount),
              money(t.gross),
              money(t.paye),
              money(t.uif),
              money(t.loan),
              money(t.savings),
              money(t.otherDeductions),
              money(t.totalDeductions),
              money(t.net),
              money(t.loanBalance),
              money(t.savingsBalance),
            ]}
          />
        </View>

        <Text style={styles.footer}>
          Internal payroll report. Reconcile totals with the payslip register before sharing externally.
        </Text>

        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
        />
      </Page>
    </Document>
  );
};

export default EmployeeDeductionsPdfDocument;

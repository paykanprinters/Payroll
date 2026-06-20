"use client";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MockPayslip, MockEmployee, MockCompanyDetails } from "@/lib/mock-data-interfaces";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import { parseISO, isSameMonth, isSameYear, isSameWeek } from "date-fns";

type AuditLevel = "minimal" | "standard" | "detailed";
type Mode = "monthly" | "weekly";

interface Props {
  payslips: MockPayslip[];
  employees: MockEmployee[];
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  auditLevel: AuditLevel;
  selectedDate: Date;
  mode: Mode;
}

const currency = (n: number) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: "#111" },
  header: { marginBottom: 12 },
  companyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { objectFit: "contain" },
  companyInfo: { textAlign: "right" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginTop: 12, marginBottom: 10 },
  subRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 12 },
  labelBold: { fontWeight: 700 },
  hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  card: { borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", padding: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  table: { width: "auto" },
  tableRow: { flexDirection: "row" },
  th: { fontSize: 10, fontWeight: 700, padding: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", width: "33.33%" },
  thSmall: { fontSize: 10, fontWeight: 700, padding: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", width: "16.66%" },
  td: { fontSize: 10, padding: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", width: "33.33%" },
  tdSmall: { fontSize: 10, padding: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", width: "16.66%" },
  tdWide: { fontSize: 10, padding: 6, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", width: "66.66%" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
});

const ReportPdfDocument: React.FC<Props> = ({
  payslips,
  employees,
  companyDetails,
  reportDesignSettings,
  auditLevel,
  selectedDate,
  mode,
}) => {
  const companyName =
    companyDetails?.companyLegalName ||
    companyDetails?.companyTradingName ||
    "Your Company Name";

  const logoSrc = reportDesignSettings.includeCompanyLogo
    ? resolveCompanyLogoSource(companyDetails?.logoUrl)
    : undefined;
  const logoDims = resolveDocumentLogoDimensions(
    companyDetails?.logoWidth,
    companyDetails?.logoHeight,
    companyDetails?.logoFit
  );

  // Exclude cash employees for reports (match existing behavior)
  const nonCashEmployees = employees.filter((e) => e.paymentMode !== "Cash");
  const nonCashIds = new Set(nonCashEmployees.map((e) => e.id));
  // Filter by selected period (so we can still use the full history to compute deltas)
  let filteredPayslips = payslips.filter((p) => nonCashIds.has(p.employeeId));
  if (mode === "monthly") {
    filteredPayslips = filteredPayslips.filter((p) => {
      const [startStr] = p.payPeriod.split(" - ");
      const d = parseISO(startStr);
      return isSameMonth(d, selectedDate) && isSameYear(d, selectedDate);
    });
  } else {
    filteredPayslips = filteredPayslips.filter((p) => {
      const [startStr] = p.payPeriod.split(" - ");
      const d = parseISO(startStr);
      return isSameWeek(d, selectedDate, { weekStartsOn: 1 }) && isSameYear(d, selectedDate);
    });
  }

  // Totals
  const totalGross = filteredPayslips.reduce((s, p) => s + (p.grossEarnings || 0), 0);
  const totalDeductions = filteredPayslips.reduce((s, p) => s + (p.totalDeductions || 0), 0);
  const totalNet = filteredPayslips.reduce((s, p) => s + (p.netPay || 0), 0);

  const reportPeriodStr = selectedDate.toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" });
  const titleSuffix = mode === "monthly" ? "Monthly" : "Weekly";

  // Build per-employee rows for the Employee Payslip Report
  const getStartDate = (period: string) => parseISO(period.split(" - ")[0]);

  const employeeRows = filteredPayslips
    .map((p) => {
      const emp = nonCashEmployees.find((e) => e.id === p.employeeId);
      const name = emp ? `${emp.firstName} ${emp.lastName}` : p.employeeId;

      const uif = (p.deductionsBreakdown || []).filter((d) => (d?.name || "").trim() === "UIF").reduce((s, d) => s + (d.amount || 0), 0);
      const paye = (p.deductionsBreakdown || []).filter((d) => (d?.name || "").trim() === "PAYE").reduce((s, d) => s + (d.amount || 0), 0);

      const currentStart = getStartDate(p.payPeriod);
      const prevForEmp = payslips
        .filter((x) => x.employeeId === p.employeeId && getStartDate(x.payPeriod) < currentStart)
        .sort((a, b) => getStartDate(b.payPeriod).getTime() - getStartDate(a.payPeriod).getTime())[0];

      const deltaGross = prevForEmp ? ((p.grossEarnings || 0) - (prevForEmp.grossEarnings || 0)) : null;
      const deltaNet = prevForEmp ? (p.netPay || 0) - (prevForEmp.netPay || 0) : null;

      return {
        name,
        gross: p.grossEarnings || 0,
        deductions: p.totalDeductions || 0,
        net: p.netPay || 0,
        uif,
        paye,
        deltaGross,
        deltaNet,
        id: p.id,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Aggregate deduction totals by type/name
  const deductionTotals: Record<string, number> = {};
  filteredPayslips.forEach((p) => {
    (p.deductionsBreakdown || []).forEach((d) => {
      const key = (d?.name || "Unknown").trim();
      const amount = Number(d?.amount || 0);
      deductionTotals[key] = (deductionTotals[key] || 0) + amount;
    });
  });
  const deductionRows = Object.entries(deductionTotals)
    .filter(([, amt]) => amt > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <Document>
      {/* Payroll Summary Report */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyRow}>
            <View>
              {logoSrc && (
                <Image src={logoSrc as string} style={[styles.logo, { width: logoDims.width, height: logoDims.height }]} />
              )}
            </View>
            <View style={styles.companyInfo}>
              <Text style={{ fontSize: 12, fontWeight: 700 }}>{companyName}</Text>
              {!!companyDetails?.physicalAddress && <Text>{companyDetails.physicalAddress}</Text>}
              {!!companyDetails?.companyRegistrationNumber && <Text>{`Reg. No: ${companyDetails.companyRegistrationNumber}`}</Text>}
              {!!companyDetails?.vatRegistrationNumber && <Text>{`VAT No: ${companyDetails.vatRegistrationNumber}`}</Text>}
              {!!companyDetails?.mainContactNumber && <Text>{`Tel: ${companyDetails.mainContactNumber}`}</Text>}
              {!!companyDetails?.companyEmail && <Text>{`Email: ${companyDetails.companyEmail}`}</Text>}
              {!!companyDetails?.companyWebsite && <Text>{`Web: ${companyDetails.companyWebsite}`}</Text>}
            </View>
          </View>
        </View>

        <View>
          <Text style={styles.title}>{`Payroll Summary Report (${titleSuffix})`}</Text>
          <View style={styles.subRow}>
            <Text><Text style={styles.labelBold}>Report Period:</Text> {reportPeriodStr}</Text>
            <Text>•</Text>
            <Text><Text style={styles.labelBold}>Employees Paid (excluding cash):</Text> {String(nonCashEmployees.length)}</Text>
          </View>
        </View>

        <View style={styles.hr} />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Overall Summary</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.th}>Metric</Text>
              <Text style={styles.th}>Amount (R)</Text>
              <Text style={styles.th}></Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tdWide}>Total Gross Earnings</Text>
              <Text style={styles.td}>{currency(totalGross)}</Text>
              <Text style={styles.td}></Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={styles.tdWide}>Total Deductions</Text>
              <Text style={styles.td}>{currency(totalDeductions)}</Text>
              <Text style={styles.td}></Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tdWide, { fontWeight: 700 }]}>Total Net Pay</Text>
              <Text style={[styles.td, { fontWeight: 700 }]}>{currency(totalNet)}</Text>
              <Text style={styles.td}></Text>
            </View>
          </View>
        </View>

        {deductionRows.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Deductions Breakdown by Type</Text>
            <View style={styles.table}>
              <View style={styles.tableRow}>
                <Text style={styles.th}>Deduction Type</Text>
                <Text style={styles.th}>Amount (R)</Text>
                <Text style={styles.th}></Text>
              </View>
              {deductionRows.map(([name, amt]) => (
                <View style={styles.tableRow} key={name}>
                  <Text style={styles.tdWide}>{name}</Text>
                  <Text style={styles.td}>{currency(amt)}</Text>
                  <Text style={styles.td}></Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>

      {/* Employee Payslip Report */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.companyRow}>
            <View>
              {logoSrc && (
                <Image src={logoSrc as string} style={[styles.logo, { width: logoDims.width, height: logoDims.height }]} />
              )}
            </View>
            <View style={styles.companyInfo}>
              <Text style={{ fontSize: 12, fontWeight: 700 }}>{companyName}</Text>
              {!!companyDetails?.physicalAddress && <Text>{companyDetails.physicalAddress}</Text>}
              {!!companyDetails?.companyRegistrationNumber && <Text>{`Reg. No: ${companyDetails.companyRegistrationNumber}`}</Text>}
              {!!companyDetails?.vatRegistrationNumber && <Text>{`VAT No: ${companyDetails.vatRegistrationNumber}`}</Text>}
              {!!companyDetails?.mainContactNumber && <Text>{`Tel: ${companyDetails.mainContactNumber}`}</Text>}
              {!!companyDetails?.companyEmail && <Text>{`Email: ${companyDetails.companyEmail}`}</Text>}
              {!!companyDetails?.companyWebsite && <Text>{`Web: ${companyDetails.companyWebsite}`}</Text>}
            </View>
          </View>
        </View>

        <Text style={styles.title}>{`Employee Payslip Report (${titleSuffix})`}</Text>
        <View style={styles.subRow}>
          <Text><Text style={styles.labelBold}>Report Period:</Text> {reportPeriodStr}</Text>
          <Text>•</Text>
          <Text><Text style={styles.labelBold}>Employees (non-cash):</Text> {String(nonCashEmployees.length)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Amounts by Employee</Text>
          <View style={styles.table}>
            {auditLevel === "detailed" ? (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.thSmall}>Employee</Text>
                  <Text style={styles.thSmall}>Gross</Text>
                  <Text style={styles.thSmall}>UIF</Text>
                  <Text style={styles.thSmall}>PAYE</Text>
                  <Text style={styles.thSmall}>Net</Text>
                  <Text style={styles.thSmall}>Change vs Prev</Text>
                </View>
                {employeeRows.filter((row) => row.deltaGross != null).map((row) => (
                  <View style={styles.tableRow} key={row.id}>
                    <Text style={styles.tdSmall}>{row.name}</Text>
                    <Text style={styles.tdSmall}>{currency(row.gross)}</Text>
                    <Text style={styles.tdSmall}>{currency(row.uif)}</Text>
                    <Text style={styles.tdSmall}>{currency(row.paye)}</Text>
                    <Text style={styles.tdSmall}>{currency(row.net)}</Text>
                    <Text style={styles.tdSmall}>{currency(row.deltaGross as number)}</Text>
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={styles.tableRow}>
                  <Text style={styles.th}>Employee</Text>
                  <Text style={styles.th}>Gross</Text>
                  <Text style={styles.th}>Net</Text>
                </View>
                {employeeRows.map((row) => (
                  <View style={styles.tableRow} key={row.id}>
                    <Text style={styles.td}>{row.name}</Text>
                    <Text style={styles.td}>{currency(row.gross)}</Text>
                    <Text style={styles.td}>{currency(row.net)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          <View style={{ marginTop: 8 }}>
            <View style={styles.summaryRow}>
              <Text style={{ fontWeight: 700 }}>Total Gross</Text>
              <Text style={{ fontWeight: 700 }}>{currency(totalGross)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ fontWeight: 700 }}>Total Deductions</Text>
              <Text style={{ fontWeight: 700 }}>{currency(totalDeductions)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={{ fontWeight: 700 }}>Total Net</Text>
              <Text style={{ fontWeight: 700 }}>{currency(totalNet)}</Text>
            </View>
          </View>
        </View>

        {auditLevel === "detailed" && (
          <View style={[styles.card, { marginTop: 10 }]}>
            <Text style={styles.sectionTitle}>Calculation Notes</Text>
            <Text style={{ fontSize: 9, color: "#374151", marginBottom: 4 }}>
              Gross includes regular hours, overtime (threshold-based), and weekend premiums; salaried employees are pro-rated for unpaid leave within the pay period.
            </Text>
            <Text style={{ fontSize: 9, color: "#374151", marginBottom: 4 }}>
              UIF is applied at the configured rate up to a monthly cap; it is excluded from PAYE taxable income.
            </Text>
            <Text style={{ fontSize: 9, color: "#374151", marginBottom: 4 }}>
              PAYE is calculated on annualized taxable income per frequency, rebates applied, then de-annualized to the period amount.
            </Text>
            <Text style={{ fontSize: 9, color: "#6b7280" }}>
              This report excludes cash-paid employees. Audit level: Detailed.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ReportPdfDocument;
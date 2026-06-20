"use client";

import React, { useMemo } from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";

type Props = {
  employee: MockEmployee;
  payslipsForYear: MockPayslip[];
  companyDetails: MockCompanyDetails | null;
  year: number;
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10.5, color: "#111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  logo: { objectFit: "contain" },
  companyInfo: { textAlign: "right" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 10, textAlign: "center", color: "#374151", marginBottom: 10 },
  card: { borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", padding: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  label: { color: "#4b5563" },
  value: { fontWeight: 600 },
  foot: { marginTop: 8, fontSize: 9, color: "#6b7280", textAlign: "center" },
});

const money = (n: number) => `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const Irp5PdfDocument: React.FC<Props> = ({ employee, payslipsForYear, companyDetails, year }) => {
  const companyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Company";
  const logoSrc = resolveCompanyLogoSource(companyDetails?.logoUrl);
  const logoDims = resolveDocumentLogoDimensions(
    companyDetails?.logoWidth,
    companyDetails?.logoHeight,
    companyDetails?.logoFit
  );

  const totals = useMemo(() => {
    const totalGross = payslipsForYear.reduce((s, p) => s + (p.grossEarnings || 0), 0);
    const totalDeductions = payslipsForYear.reduce((s, p) => s + (p.totalDeductions || 0), 0);
    const paye = payslipsForYear.reduce(
      (s, p) => s + ((p.deductionsBreakdown || []).find((d) => (d?.name || "").trim() === "PAYE")?.amount || 0),
      0
    );
    const uif = payslipsForYear.reduce(
      (s, p) => s + ((p.deductionsBreakdown || []).find((d) => (d?.name || "").trim() === "UIF")?.amount || 0),
      0
    );
    const sdl = payslipsForYear.reduce(
      (s, p) => s + ((p.deductionsBreakdown || []).find((d) => (d?.name || "").trim() === "SDL")?.amount || 0),
      0
    );
    return { totalGross, totalDeductions, paye, uif, sdl };
  }, [payslipsForYear]);

  const field = (label: string, value: string) => (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || "—"}</Text>
    </View>
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>{logoSrc && <Image src={logoSrc} style={[styles.logo, { width: logoDims.width, height: logoDims.height }]} />}</View>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>{companyName}</Text>
            {!!companyDetails?.payeReferenceNumber && <Text>{`PAYE Ref: ${companyDetails.payeReferenceNumber}`}</Text>}
            {!!companyDetails?.uifReferenceNumber && <Text>{`UIF Ref: ${companyDetails.uifReferenceNumber}`}</Text>}
            {!!companyDetails?.sdlReferenceNumber && <Text>{`SDL Ref: ${companyDetails.sdlReferenceNumber}`}</Text>}
            {!!companyDetails?.physicalAddress && <Text>{companyDetails.physicalAddress}</Text>}
          </View>
        </View>

        <Text style={styles.title}>{`IRP5 / Tax Certificate Summary`}</Text>
        <Text style={styles.sub}>{`Tax year: ${year}`}</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Employee</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              {field("Employee name", `${employee.firstName} ${employee.lastName}`)}
              {field("Employee ID", employee.customEmployeeId || "—")}
              {field("ID number", employee.idNumber || "—")}
            </View>
            <View style={styles.col}>
              {field("Tax reference", employee.taxReferenceNumber || "—")}
              {field("Start date", employee.startDate || "—")}
              {field("Date of birth", employee.dateOfBirth || "—")}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Totals (year-to-date)</Text>
          {field("Gross remuneration", money(totals.totalGross))}
          {field("Total deductions", money(totals.totalDeductions))}
          {field("PAYE deducted", money(totals.paye))}
          {field("UIF contributions", money(totals.uif))}
          {field("SDL contributions", money(totals.sdl))}
        </View>

        <Text style={styles.foot}>
          This certificate is system-generated from payroll runs and recorded payslips. Verify statutory settings and employee tax details before submission.
        </Text>
      </Page>
    </Document>
  );
};

export default Irp5PdfDocument;

"use client";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import { resolveCompanyLogoSource, resolveDocumentLogoDimensions } from "@/lib/document-logo";
import {
  buildEmployeeTaxCertificate,
  formatIrp5Money,
  getEmployeeTaxCertificateLabel,
  type Irp5Certificate,
  type Irp5SourceCodeLine,
} from "@/lib/irp5-certificate";

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
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 4 },
  sub: { fontSize: 10, textAlign: "center", color: "#374151", marginBottom: 2 },
  certMeta: { fontSize: 9, textAlign: "center", color: "#6b7280", marginBottom: 10 },
  card: { borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", padding: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  sourceRow: { flexDirection: "row", justifyContent: "space-between", gap: 6, marginBottom: 3 },
  label: { color: "#4b5563", flex: 1 },
  value: { fontWeight: 600 },
  code: { color: "#9ca3af", fontSize: 9 },
  alert: { fontSize: 9, color: "#b45309", marginBottom: 8, padding: 6, borderWidth: 1, borderColor: "#fcd34d" },
  foot: { marginTop: 8, fontSize: 9, color: "#6b7280", textAlign: "center" },
});

const field = (label: string, value: string) => (
  <View style={styles.fieldRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || "—"}</Text>
  </View>
);

const sourceLines = (lines: Irp5SourceCodeLine[]) =>
  lines.map((l) => (
    <View key={`${l.code}-${l.label}`} style={styles.sourceRow}>
      <Text style={styles.label}>{`${l.label} (${l.code})`}</Text>
      <Text style={styles.value}>{`R ${formatIrp5Money(l.amount)}`}</Text>
    </View>
  ));

const Irp5PdfBody: React.FC<{ cert: Irp5Certificate; companyDetails: MockCompanyDetails | null }> = ({
  cert,
  companyDetails,
}) => {
  const companyName = cert.employer.name;
  const logoSrc = resolveCompanyLogoSource(companyDetails?.logoUrl);
  const logoDims = resolveDocumentLogoDimensions(
    companyDetails?.logoWidth,
    companyDetails?.logoHeight,
    companyDetails?.logoFit
  );
  const typeLabel = getEmployeeTaxCertificateLabel(cert.certificateType);
  const incomeTotalLabel =
    cert.certificateType === "IT3a"
      ? "Non-taxable income"
      : "Taxable income (after retirement)";
  const incomeTotalAmount =
    cert.certificateType === "IT3a"
      ? cert.totals.nonTaxableIncome
      : cert.totals.taxableIncome;

  return (
    <>
      <View style={styles.headerRow}>
        <View>{logoSrc && <Image src={logoSrc} style={[styles.logo, { width: logoDims.width, height: logoDims.height }]} />}</View>
        <View style={styles.companyInfo}>
          <Text style={{ fontSize: 12, fontWeight: 700 }}>{companyName}</Text>
          {!!cert.employer.payeReferenceNumber && <Text>{`PAYE Ref: ${cert.employer.payeReferenceNumber}`}</Text>}
          {!!cert.employer.uifReferenceNumber && <Text>{`UIF Ref: ${cert.employer.uifReferenceNumber}`}</Text>}
          {!!cert.employer.address && <Text>{cert.employer.address}</Text>}
        </View>
      </View>

      <Text style={styles.title}>{`${typeLabel} Employee Tax Certificate`}</Text>
      <Text style={styles.sub}>{`Tax year ${cert.taxYear} (${cert.periodLabel})`}</Text>
      <Text style={styles.certMeta}>{`Certificate ${cert.certificateNumber} · ${cert.payslipCount} pay period(s)`}</Text>

      {cert.validation.warnings.length > 0 && (
        <Text style={styles.alert}>
          {`Warnings: ${cert.validation.warnings.map((w) => w.message).join(" ")}`}
        </Text>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Employee</Text>
        <View style={styles.row}>
          <View style={styles.col}>
            {field("Employee name", cert.employee.fullName)}
            {field("Employee no.", cert.employee.customEmployeeId || "—")}
            {field("ID number", cert.employee.idNumber || "—")}
          </View>
          <View style={styles.col}>
            {field("Tax reference", cert.employee.taxReferenceNumber || "—")}
            {field("Start date", cert.employee.startDate || "—")}
            {field("Date of birth", cert.employee.dateOfBirth || "—")}
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Income (source codes)</Text>
        {sourceLines(cert.income)}
        {field(incomeTotalLabel, `R ${formatIrp5Money(incomeTotalAmount)}`)}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Deductions & credits</Text>
        {cert.deductions.length > 0 ? sourceLines(cert.deductions) : field("—", "None")}
      </View>

      <Text style={styles.foot}>
        {`Issued ${cert.issuedDate}. ${
          cert.certificateType === "IT3a"
            ? "IT3(a) is issued when remuneration was paid but no PAYE was deducted."
            : "SDL is declared on EMP201, not on the employee IRP5."
        } Verify before eFiling submission.`}
      </Text>
    </>
  );
};

const Irp5PdfDocument: React.FC<Props> = ({ employee, payslipsForYear, companyDetails, year }) => {
  const cert = buildEmployeeTaxCertificate(employee, payslipsForYear, companyDetails, year);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Irp5PdfBody cert={cert} companyDetails={companyDetails} />
      </Page>
    </Document>
  );
};

export default Irp5PdfDocument;

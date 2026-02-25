"use client";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MockCompanyDetails, MockEmployee } from "@/lib/mock-data-interfaces";

type Props = {
  employee: MockEmployee;
  companyDetails: MockCompanyDetails | null;
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: "#111" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  logo: { objectFit: "contain" },
  companyInfo: { textAlign: "right" },
  title: { fontSize: 16, fontWeight: 700, textAlign: "center", marginBottom: 10 },
  section: { borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", padding: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 8 },
  gridRow: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  fieldRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginBottom: 4 },
  label: { color: "#4b5563" },
  value: { fontWeight: 600 },
});

const val = (v: unknown) => {
  if (v === undefined || v === null) return "—";
  const s = String(v).trim();
  return s.length ? s : "—";
};

const EmployeeProfilePdfDocument: React.FC<Props> = ({ employee, companyDetails }) => {
  const companyName =
    companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Company";
  const logoSrc = companyDetails?.logoUrl || undefined;
  const logoW = (companyDetails?.logoWidth as number) || 100;
  const logoH = (companyDetails?.logoHeight as number) || 50;

  const renderField = (label: string, value: unknown) => (
    <View style={styles.fieldRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{val(value)}</Text>
    </View>
  );

  const renderAddress = () => {
    const parts = [employee.addressLine1, employee.addressLine2, employee.city, employee.province, employee.postalCode]
      .filter(Boolean)
      .join(", ");
    return renderField("Address", parts || "—");
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {logoSrc && <Image src={logoSrc} style={[styles.logo, { width: logoW, height: logoH }]} />}
          </View>
          <View style={styles.companyInfo}>
            <Text style={{ fontSize: 12, fontWeight: 700 }}>{companyName}</Text>
            {!!companyDetails?.companyRegistrationNumber && (
              <Text>{`Reg. No: ${companyDetails.companyRegistrationNumber}`}</Text>
            )}
            {!!companyDetails?.companyTaxNumber && <Text>{`Tax No: ${companyDetails.companyTaxNumber}`}</Text>}
            {!!companyDetails?.vatRegistrationNumber && <Text>{`VAT No: ${companyDetails.vatRegistrationNumber}`}</Text>}
            {!!companyDetails?.companyEmail && <Text>{`Email: ${companyDetails.companyEmail}`}</Text>}
          </View>
        </View>

        <Text style={styles.title}>{`Employee Profile — ${employee.firstName} ${employee.lastName}`}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic</Text>
          <View style={styles.gridRow}>
            <View style={styles.col}>
              {renderField("Employee ID", employee.customEmployeeId)}
              {renderField("First name", employee.firstName)}
              {renderField("Last name", employee.lastName)}
              {renderField("Email", employee.email)}
              {renderField("Phone", employee.phoneNumber)}
            </View>
            <View style={styles.col}>
              {renderField("Job title", employee.jobTitle)}
              {renderField("Department", employee.department)}
              {renderField("Work location", employee.workLocation)}
              {renderField("Start date", employee.startDate)}
              {renderField("Employment type", employee.employmentType)}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal</Text>
          <View style={styles.gridRow}>
            <View style={styles.col}>
              {renderField("Date of birth", employee.dateOfBirth)}
              {renderField("Gender", employee.gender)}
              {renderField("National ID", employee.idNumber)}
              {renderField("Tax reference", employee.taxReferenceNumber)}
              {renderField("UIF number", employee.uifNumber)}
            </View>
            <View style={styles.col}>{renderAddress()}</View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pay & Bank</Text>
          <View style={styles.gridRow}>
            <View style={styles.col}>
              {renderField("Payment mode", employee.paymentMode)}
              {renderField("Pay frequency", employee.payFrequency)}
              {renderField("Salary", employee.salary != null ? `R ${Number(employee.salary).toFixed(2)}` : "—")}
              {renderField(
                "Hourly rate",
                employee.hourlyRate != null ? `R ${Number(employee.hourlyRate).toFixed(2)} / hr` : "—"
              )}
              {renderField("Std daily hours", employee.standardDailyHours)}
            </View>
            <View style={styles.col}>
              {renderField("Bank", employee.bankName)}
              {renderField("Account holder", employee.bankAccountHolder)}
              {renderField("Account number", employee.accountNumber)}
              {renderField("Branch code", employee.branchCode)}
              {renderField("Account type", employee.bankAccountType)}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          {renderField("Name", employee.emergencyContactName)}
          {renderField("Number", employee.emergencyContactNumber)}
          {renderField("Address", employee.emergencyContactAddress)}
        </View>
      </Page>
    </Document>
  );
};

export default EmployeeProfilePdfDocument;

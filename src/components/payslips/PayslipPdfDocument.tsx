"use client";

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { MockPayslip, MockCompanyDetails, MockEmployee, PayslipDesignSettings } from "@/lib/mock-data-interfaces";
import { resolveDocumentLogoDimensions, resolvePayslipLogoSource } from "@/lib/document-logo";

interface Props {
  payslips: MockPayslip[];
  employees: MockEmployee[];
  companyDetails: MockCompanyDetails | null;
  payslipDesignSettings: PayslipDesignSettings;
  getEmployeeName: (id: string) => string;
}

const currency = (n: number) =>
  `R ${Number(n || 0).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 11, color: "#111" },
  headerTitle: { fontSize: 16, textAlign: "center", fontWeight: 700, marginBottom: 4 },
  headerSub: { fontSize: 10, textAlign: "center", color: "#333", marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  card: { borderRadius: 6, borderWidth: 1, borderColor: "#d1d5db", padding: 8 },
  label: { fontSize: 10, color: "#4b5563", marginBottom: 2 },
  text: { fontSize: 11 },
  logo: { objectFit: "contain" },
  sectionTitle: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
  listRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  hr: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 8 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  ytdRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
});

const PayslipPdfDocument: React.FC<Props> = ({
  payslips,
  employees,
  companyDetails,
  payslipDesignSettings,
  getEmployeeName,
}) => {
  // Per-payslip branding is computed inside the map

  return (
    <Document>
      {payslips.map((p) => {
        const employee = employees.find((e) => e.id === p.employeeId);
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : getEmployeeName(p.employeeId);
        const pCompanyName = p.companyName || companyDetails?.companyTradingName || companyDetails?.companyLegalName || "Company";
        const pCompanyAddress = p.companyAddress || companyDetails?.physicalAddress;
        const pLogoSrc = resolvePayslipLogoSource(
          payslipDesignSettings.payslipLogoUrl,
          companyDetails?.logoUrl,
          p.companyLogoUrl
        );
        const pLogoDims = resolveDocumentLogoDimensions(
          payslipDesignSettings.payslipLogoWidth ?? companyDetails?.logoWidth,
          payslipDesignSettings.payslipLogoHeight ?? companyDetails?.logoHeight,
          payslipDesignSettings.payslipLogoFit ?? companyDetails?.logoFit
        );

        return (
          <Page size="A4" style={styles.page} key={p.id}>
            <Text style={styles.headerTitle}>{`Payslip • ${employeeName} — ${p.payPeriod}`}</Text>
            <Text style={styles.headerSub}>{`Pay Date: ${p.payDate}`}</Text>

            {(payslipDesignSettings.showEmployeeDetails || payslipDesignSettings.showBankDetails || payslipDesignSettings.showCompanyDetails || (payslipDesignSettings.showCompanyLogo && pLogoSrc)) && (
              <View style={styles.row}>
                <View style={[styles.col, styles.card]}>
                  {payslipDesignSettings.showEmployeeDetails && (
                    <>
                      <Text style={styles.label}>{employeeName}</Text>
                      <Text style={styles.text}>
                        {(employee?.jobTitle || "Employee")}{employee?.customEmployeeId ? ` • ${employee.customEmployeeId}` : ""}
                      </Text>
                    </>
                  )}
                  {!!payslipDesignSettings.showHourlyRate && employee?.hourlyRate != null && (
                    <Text style={styles.text}>{`Hourly Rate: ${currency(employee.hourlyRate)}`}</Text>
                  )}
                  {!!payslipDesignSettings.showEmployeeIdNumber && !!employee?.idNumber && (
                    <Text style={styles.text}>{`ID: ${employee.idNumber}`}</Text>
                  )}
                  {!!payslipDesignSettings.showEmployeeTaxRefNumber && !!employee?.taxReferenceNumber && (
                    <Text style={styles.text}>{`Tax Ref: ${employee.taxReferenceNumber}`}</Text>
                  )}
                  {!!payslipDesignSettings.showEmployeeAddress && (
                    <>
                      {(employee?.addressLine1 || employee?.addressLine2) && (
                        <Text style={styles.text}>
                          {[employee?.addressLine1, employee?.addressLine2].filter(Boolean).join(", ")}
                        </Text>
                      )}
                      {(employee?.city || employee?.province || employee?.postalCode) && (
                        <Text style={styles.text}>
                          {[employee?.city, employee?.province, employee?.postalCode].filter(Boolean).join(", ")}
                        </Text>
                      )}
                    </>
                  )}
                  {!!employee?.startDate && payslipDesignSettings.showEmployeeDetails && (
                    <Text style={styles.text}>{`Start: ${employee.startDate}`}</Text>
                  )}
                  {!!payslipDesignSettings.showBankDetails && (employee?.bankName || employee?.accountNumber) && (
                    <>
                      <View style={styles.hr} />
                      <Text style={styles.label}>Bank Details</Text>
                      <Text style={styles.text}>{employee?.bankName || "—"}</Text>
                      <Text style={styles.text}>
                        {employee?.accountNumber ? `•••• ${employee.accountNumber.slice(-4)}` : "—"}
                        {employee?.branchCode ? ` • Branch: ${employee.branchCode}` : ""}
                      </Text>
                    </>
                  )}
                </View>
                <View style={[styles.col, styles.card]}>
                  {(payslipDesignSettings.showCompanyLogo && pLogoSrc) && (
                    <Image src={pLogoSrc as string} style={[styles.logo, { width: pLogoDims.width, height: pLogoDims.height, marginBottom: 6 }]} />
                  )}
                  {!!payslipDesignSettings.showCompanyDetails && (
                    <>
                      <Text style={styles.text}>
                        {pCompanyName}
                      </Text>
                      {!!companyDetails?.companyLegalName && (
                        <Text style={styles.text}>{`Legal: ${companyDetails.companyLegalName}`}</Text>
                      )}
                      {!!companyDetails?.companyRegistrationNumber && (
                        <Text style={styles.text}>{`Reg No: ${companyDetails.companyRegistrationNumber}`}</Text>
                      )}
                      {!!companyDetails?.companyTaxNumber && (
                        <Text style={styles.text}>{`Tax No: ${companyDetails.companyTaxNumber}`}</Text>
                      )}
                      {!!companyDetails?.vatRegistrationNumber && (
                        <Text style={styles.text}>{`VAT: ${companyDetails.vatRegistrationNumber}`}</Text>
                      )}
                      {!!pCompanyAddress && (
                        <Text style={styles.text}>{pCompanyAddress}</Text>
                      )}
                      {(companyDetails?.mainContactNumber || companyDetails?.companyEmail) && (
                        <Text style={styles.text}>
                          {companyDetails?.mainContactNumber || ""}{companyDetails?.mainContactNumber && companyDetails?.companyEmail ? " • " : ""}{companyDetails?.companyEmail || ""}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              <View style={styles.row}>
                <View style={[styles.col, styles.card]}>
                  <Text style={styles.sectionTitle}>Earnings</Text>
                  {(p?.earningsBreakdown || []).map((e, idx) => (
                    <View style={styles.listRow} key={`${e.name}-${idx}`}>
                      <Text>{e.name}</Text>
                      <Text>{currency(e.amount)}</Text>
                    </View>
                  ))}
                  <View style={styles.hr} />
                  <View style={styles.summaryRow}>
                    <Text style={{ fontWeight: 600 }}>Total Earnings</Text>
                    <Text style={{ fontWeight: 700 }}>{currency(p.grossEarnings)}</Text>
                  </View>
                </View>
                <View style={[styles.col, styles.card]}>
                  <Text style={styles.sectionTitle}>Deductions</Text>
                  {(p?.deductionsBreakdown || []).length > 0 ? (
                    (p.deductionsBreakdown || []).map((d, idx) => (
                      <View style={styles.listRow} key={`${d.name}-${idx}`}>
                        <Text>{d.name}</Text>
                        <Text>{currency(d.amount)}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: "#6b7280" }}>No deductions for this period.</Text>
                  )}
                  <View style={styles.hr} />
                  <View style={styles.summaryRow}>
                    <Text style={{ fontWeight: 600 }}>Total Deductions</Text>
                    <Text style={{ fontWeight: 700 }}>{currency(p.totalDeductions)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {payslipDesignSettings.showLeaveSummary && p?.leaveSummary && (
              <View style={[styles.card, { marginTop: 12 }]}>
                <Text style={styles.sectionTitle}>Leave Summary</Text>
                <View style={styles.row}>
                  <View style={styles.col}>
                    <View style={styles.listRow}><Text>Annual</Text><Text>{String(p.leaveSummary.annual)}</Text></View>
                  </View>
                  <View style={styles.col}>
                    <View style={styles.listRow}><Text>Sick</Text><Text>{String(p.leaveSummary.sick)}</Text></View>
                  </View>
                  <View style={styles.col}>
                    <View style={styles.listRow}><Text>Unpaid</Text><Text>{String(p.leaveSummary.unpaid)}</Text></View>
                  </View>
                </View>
              </View>
            )}

            <View style={[styles.card, { marginTop: 12 }]}>
              <View style={styles.summaryRow}>
                <Text style={{ fontWeight: 600 }}>Gross Earnings</Text>
                <Text>{currency(p.grossEarnings)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={{ fontWeight: 600 }}>Total Deductions</Text>
                <Text>{currency(p.totalDeductions)}</Text>
              </View>
              {p?.ytdGrossEarnings != null && p?.ytdTotalDeductions != null && payslipDesignSettings.showYTD && (
                <>
                  <View style={styles.hr} />
                  <View style={styles.ytdRow}><Text>YTD Gross</Text><Text>{currency(p.ytdGrossEarnings || 0)}</Text></View>
                  <View style={styles.ytdRow}><Text>YTD Deductions</Text><Text>{currency(p.ytdTotalDeductions || 0)}</Text></View>
                </>
              )}
              {payslipDesignSettings.showLoan && p?.loanDeduction != null && (
                <View style={styles.ytdRow}><Text>Loan deduction</Text><Text>{currency(p.loanDeduction)}</Text></View>
              )}
              {payslipDesignSettings.showLoan && p?.loanBalance != null && (
                <View style={styles.ytdRow}><Text>Loan outstanding</Text><Text>{currency(p.loanBalance)}</Text></View>
              )}
              {payslipDesignSettings.showSavingsBalance && p?.savingsBalance != null && (
                <View style={styles.ytdRow}><Text>Savings already saved</Text><Text>{currency(p.savingsBalance)}</Text></View>
              )}
              <View style={styles.hr} />
              <View style={styles.summaryRow}>
                <Text style={{ fontSize: 12, fontWeight: 700 }}>Net Pay</Text>
                <Text style={{ fontSize: 12, fontWeight: 700 }}>{currency(p.netPay)}</Text>
              </View>
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default PayslipPdfDocument;
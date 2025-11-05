"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  MockPayslip,
  MockCompanyDetails,
  MockEmployee,
  PayslipDesignSettings,
} from "@/lib/mock-data-interfaces";

type LayoutSide = "deductions-left-earnings-right" | "earnings-left-deductions-right";

interface Props {
  payslip: MockPayslip;
  payslipDesignSettings: PayslipDesignSettings;
  companyDetails: MockCompanyDetails;
  employees: MockEmployee[];
  getEmployeeName: (id: string) => string;
  isPdfGeneration?: boolean;
}

const currency = (n: number) =>
  `R ${n.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function maskAccount(num?: string) {
  if (!num) return "—";
  const last4 = num.slice(-4);
  return `•••• ${last4}`;
}

const IndividualPayslipCard: React.FC<Props> = ({
  payslip,
  payslipDesignSettings,
  companyDetails,
  employees,
  getEmployeeName,
  isPdfGeneration = false,
}) => {
  const employee = employees.find((e) => e.id === payslip.employeeId);
  const employeeName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : getEmployeeName(payslip.employeeId);

  const {
    showCompanyLogo,
    showCompanyDetails,
    showEmployeeDetails,
    showHourlyRate,
    showEarningsBreakdown,
    showDeductionsBreakdown,
    showLeaveSummary,
    showBankDetails,
    showYTD,
    earningsDeductionsLayout,
    sectionOrder,
    payslipLogoUrl,
    payslipLogoWidth,
    payslipLogoHeight,
    payslipLogoFit,
  } = payslipDesignSettings;

  const logoSrc = payslipLogoUrl || companyDetails.logoUrl || "";

  const earningsTotal = useMemo(
    () => payslip.earningsBreakdown.reduce((sum, e) => sum + (e?.amount || 0), 0),
    [payslip.earningsBreakdown]
  );

  const deductionsTotal = useMemo(
    () => payslip.deductionsBreakdown.reduce((sum, d) => sum + (d?.amount || 0), 0),
    [payslip.deductionsBreakdown]
  );

  const renderCompanyBlock = () => {
    if (!showCompanyDetails && !(showCompanyLogo && logoSrc)) return null;
    return (
      <div className="rounded-md border p-3">
        {showCompanyLogo && logoSrc ? (
          <div className="mb-3">
            <img
              src={logoSrc}
              alt="Company Logo"
              style={{
                width: payslipLogoWidth || 100,
                height: payslipLogoHeight || 50,
                objectFit: payslipLogoFit || "contain",
              }}
              className="inline-block"
            />
          </div>
        ) : null}
        {showCompanyDetails ? (
          <div className="text-sm space-y-1">
            <div className="font-medium">
              {companyDetails.companyTradingName || companyDetails.companyLegalName || "Company"}
            </div>
            {companyDetails.companyLegalName && (
              <div className="text-muted-foreground">
                Legal: {companyDetails.companyLegalName}
              </div>
            )}
            {companyDetails.companyRegistrationNumber && (
              <div className="text-muted-foreground">
                Reg No: {companyDetails.companyRegistrationNumber}
              </div>
            )}
            {companyDetails.companyTaxNumber && (
              <div className="text-muted-foreground">
                Tax No: {companyDetails.companyTaxNumber}
              </div>
            )}
            {companyDetails.vatRegistrationNumber && (
              <div className="text-muted-foreground">
                VAT: {companyDetails.vatRegistrationNumber}
              </div>
            )}
            {companyDetails.physicalAddress && (
              <div className="text-muted-foreground">{companyDetails.physicalAddress}</div>
            )}
            {(companyDetails.mainContactNumber || companyDetails.companyEmail) && (
              <div className="text-muted-foreground">
                {companyDetails.mainContactNumber || ""}{companyDetails.mainContactNumber && companyDetails.companyEmail ? " • " : ""}
                {companyDetails.companyEmail || ""}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderEmployeeBlock = () => {
    if (!showEmployeeDetails && !showBankDetails && !showHourlyRate) return null;
    return (
      <div className="rounded-md border p-3">
        {showEmployeeDetails ? (
          <div className="text-sm space-y-1">
            <div className="font-medium">{employeeName}</div>
            <div className="text-muted-foreground">
              {employee?.jobTitle || "Employee"}
              {employee?.customEmployeeId ? ` • ${employee.customEmployeeId}` : ""}
            </div>
            {employee?.idNumber && (
              <div className="text-muted-foreground">ID: {employee.idNumber}</div>
            )}
            {employee?.startDate && (
              <div className="text-muted-foreground">Start: {employee.startDate}</div>
            )}
            {showHourlyRate && employee?.hourlyRate != null ? (
              <div className="text-muted-foreground">
                Hourly Rate: {currency(employee.hourlyRate)}
              </div>
            ) : null}
          </div>
        ) : null}

        {(showBankDetails && (employee?.bankName || employee?.accountNumber)) ? (
          <>
            <Separator className="my-3" />
            <div className="text-sm space-y-1">
              <div className="font-medium">Bank Details</div>
              <div className="text-muted-foreground">
                {employee?.bankName || "—"}
              </div>
              <div className="text-muted-foreground">
                {maskAccount(employee?.accountNumber)}
                {employee?.branchCode ? ` • Branch: ${employee.branchCode}` : ""}
              </div>
              {employee?.bankAccountType && (
                <div className="text-muted-foreground">Type: {employee.bankAccountType}</div>
              )}
            </div>
          </>
        ) : null}
      </div>
    );
  };

  const EarningsBox = (
    <div className="rounded-md border p-4">
      <div className="font-semibold mb-2">Earnings</div>
      <div className="space-y-2">
        {showEarningsBreakdown ? (
          payslip.earningsBreakdown.map((e, idx) => (
            <div key={`${e.name}-${idx}`} className="flex items-center justify-between">
              <span className="text-sm">{e.name}</span>
              <span className="text-sm font-medium">{currency(e.amount)}</span>
            </div>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">
            Earnings breakdown hidden
          </div>
        )}
      </div>
      <Separator className="my-3" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Earnings</span>
        <span className="text-sm font-semibold">{currency(earningsTotal)}</span>
      </div>
    </div>
  );

  const DeductionsBox = (
    <div className="rounded-md border p-4">
      <div className="font-semibold mb-2">Deductions</div>
      <div className="space-y-2">
        {showDeductionsBreakdown ? (
          payslip.deductionsBreakdown.length > 0 ? (
            payslip.deductionsBreakdown.map((d, idx) => (
              <div key={`${d.name}-${idx}`} className="flex items-center justify-between">
                <span className="text-sm">{d.name}</span>
                <span className="text-sm font-medium">{currency(d.amount)}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No deductions for this period.</div>
          )
        ) : (
          <div className="text-sm text-muted-foreground">
            Deductions breakdown hidden
          </div>
        )}
      </div>
      <Separator className="my-3" />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Total Deductions</span>
        <span className="text-sm font-semibold">{currency(deductionsTotal)}</span>
      </div>
    </div>
  );

  const layout: LayoutSide = earningsDeductionsLayout || "deductions-left-earnings-right";
  const leftBox = layout === "deductions-left-earnings-right" ? DeductionsBox : EarningsBox;
  const rightBox = layout === "deductions-left-earnings-right" ? EarningsBox : DeductionsBox;

  // When stacked (mobile), respect sectionOrder
  const stacked = sectionOrder || ["Earnings", "Deductions"];
  const stackedBoxes =
    stacked.map((s) => (s === "Earnings" ? EarningsBox : DeductionsBox));

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">
          Payslip {employeeName ? `• ${employeeName}` : ""} — {payslip.payPeriod}
        </CardTitle>
        <div className="text-sm text-muted-foreground">Pay Date: {payslip.payDate}</div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Header: Employee (left) and Company (right) */}
        {(showEmployeeDetails || showBankDetails || showCompanyDetails || (showCompanyLogo && logoSrc)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Employee block on the left */}
            <div>{renderEmployeeBlock()}</div>
            {/* Company block on the right */}
            <div>{renderCompanyBlock()}</div>
          </div>
        )}

        {/* Earnings / Deductions */}
        <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>{leftBox}</div>
          <div>{rightBox}</div>
        </div>
        <div className="md:hidden space-y-6">
          {stackedBoxes.map((box, idx) => (
            <div key={idx}>{box}</div>
          ))}
        </div>

        {/* Leave Summary */}
        {showLeaveSummary && payslip.leaveSummary ? (
          <div className="rounded-md border p-4">
            <div className="font-semibold mb-2">Leave Summary</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span>Annual</span>
                <span className="font-medium">
                  {payslip.leaveSummary.annual}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Sick</span>
                <span className="font-medium">
                  {payslip.leaveSummary.sick}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Unpaid</span>
                <span className="font-medium">
                  {payslip.leaveSummary.unpaid}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Summary */}
        <div className="rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Gross Earnings</span>
            <span className="text-sm">{currency(payslip.grossEarnings)}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm font-medium">Total Deductions</span>
            <span className="text-sm">{currency(payslip.totalDeductions)}</span>
          </div>

          {showYTD ? (
            <>
              <Separator className="my-3" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">YTD Gross</span>
                <span className="text-sm">
                  {currency(payslip.ytdGrossEarnings || 0)}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium">YTD Deductions</span>
                <span className="text-sm">
                  {currency(payslip.ytdTotalDeductions || 0)}
                </span>
              </div>
            </>
          ) : null}

          <Separator className="my-3" />
          <div className="flex items-center justify-between">
            <span className="text-base font-semibold">Net Pay</span>
            <span className="text-base font-bold">{currency(payslip.netPay)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IndividualPayslipCard;
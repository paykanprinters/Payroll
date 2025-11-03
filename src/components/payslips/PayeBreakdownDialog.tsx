"use client";

import React, { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { differenceInYears } from "date-fns";
import { bankersRound } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payslip: MockPayslip;
};

const currency = (n: number) => `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PayeBreakdownDialog: React.FC<Props> = ({ open, onOpenChange, payslip }) => {
  const { employees, taxTables, userTaxSettings } = usePayrollProcessor({ silent: true });

  const breakdown = useMemo(() => {
    const employee = employees.find(e => e.id === payslip.employeeId);
    if (!employee) {
      return { error: "Employee not found for this payslip." } as const;
    }
    const payFrequency = employee.payFrequency || "Monthly";
    const applyPayeFlag = userTaxSettings?.applyPaye ?? true;

    // Get UIF from the payslip itself to match final numbers precisely
    const uifFromPayslip = payslip.deductionsBreakdown.find(d => d.name === "UIF")?.amount ?? 0;

    const gross = payslip.grossEarnings;
    const taxableForPAYE = Math.max(0, gross - uifFromPayslip);

    // Annualization factors aligned with our calculation logic
    let annualizationFactor = 12;
    if (payFrequency === "Weekly") annualizationFactor = 52;
    if (payFrequency === "Bi-Weekly") annualizationFactor = 26;
    const deAnnualizationFactor = annualizationFactor;

    const annualIncome = taxableForPAYE * annualizationFactor;

    if (!taxTables || !taxTables.payeBrackets || taxTables.payeBrackets.length === 0) {
      return { error: "PAYE tax tables are not loaded. Please fetch and apply the tax tables." } as const;
    }

    // Determine bracket used
    const bracket = taxTables.payeBrackets.find(b =>
      annualIncome >= b.min_income && (b.max_income === null || annualIncome <= b.max_income)
    ) ?? taxTables.payeBrackets[taxTables.payeBrackets.length - 1];

    const annualPAYEBeforeRebate = (annualIncome - bracket.min_income) * bracket.rate + bracket.deduction;

    // Determine rebate based on age
    const rebates = taxTables.taxYearDetails?.rebates || null;
    let employeeAge: number | null = null;
    if (employee.dateOfBirth) {
      try {
        employeeAge = differenceInYears(new Date(), new Date(employee.dateOfBirth));
      } catch {
        employeeAge = null;
      }
    }

    let totalRebate = 0;
    let rebateLabel = "Under 65";
    if (rebates) {
      if (employeeAge === null) {
        totalRebate = rebates.under65;
        rebateLabel = "Under 65 (default when unknown)";
      } else if (employeeAge < 65) {
        totalRebate = rebates.under65;
        rebateLabel = "Under 65";
      } else if (employeeAge < 75) {
        totalRebate = rebates.under65 + rebates.sixtyFiveToSeventyFour;
        rebateLabel = "65–74";
      } else {
        totalRebate = rebates.under65 + rebates.sixtyFiveToSeventyFour + rebates.seventyFivePlus;
        rebateLabel = "75+";
      }
    }

    const annualPAYEAfterRebate = Math.max(0, annualPAYEBeforeRebate - totalRebate);
    const periodPayeraw = annualPAYEAfterRebate / deAnnualizationFactor;
    const periodPayeRounded = bankersRound(periodPayeraw, 2);

    const payeFromPayslip = payslip.deductionsBreakdown.find(d => d.name === "PAYE")?.amount ?? 0;

    return {
      employeeName: `${employee.firstName} ${employee.lastName}`,
      payFrequency,
      gross,
      uifFromPayslip,
      taxableForPAYE,
      annualizationFactor,
      annualIncome,
      bracket,
      annualPAYEBeforeRebate,
      totalRebate,
      rebateLabel,
      annualPAYEAfterRebate,
      deAnnualizationFactor,
      periodPayeraw,
      periodPayeRounded,
      payeFromPayslip,
      applyPayeFlag,
    } as const;
  }, [employees, taxTables, userTaxSettings, payslip]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>PAYE Breakdown</DialogTitle>
          <DialogDescription>Step-by-step explanation of how PAYE was calculated for this payslip.</DialogDescription>
        </DialogHeader>

        {"error" in breakdown ? (
          <div className="text-red-600 text-sm">{breakdown.error}</div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm">
              <div className="flex justify-between"><span>Employee</span><span className="font-medium">{breakdown.employeeName}</span></div>
              <div className="flex justify-between"><span>Pay Frequency</span><span className="font-medium">{breakdown.payFrequency}</span></div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Gross Earnings</span><span className="font-medium">{currency(breakdown.gross)}</span></div>
              <div className="flex justify-between"><span>Less: UIF (employee)</span><span className="font-medium">- {currency(breakdown.uifFromPayslip)}</span></div>
              <div className="flex justify-between"><span>Taxable Income for PAYE</span><span className="font-medium">{currency(breakdown.taxableForPAYE)}</span></div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Annualization Factor</span><span className="font-medium">{breakdown.annualizationFactor}x</span></div>
              <div className="flex justify-between"><span>Annualized Taxable Income</span><span className="font-medium">{currency(breakdown.annualIncome)}</span></div>
              <div className="flex justify-between"><span>Matched Bracket</span>
                <span className="font-medium">
                  {currency(breakdown.bracket.min_income)} to {breakdown.bracket.max_income ? currency(breakdown.bracket.max_income) : "Above"}
                </span>
              </div>
              <div className="flex justify-between"><span>Rate</span><span className="font-medium">{(breakdown.bracket.rate * 100).toFixed(2)}%</span></div>
              <div className="flex justify-between"><span>Threshold (min)</span><span className="font-medium">{currency(breakdown.bracket.min_income)}</span></div>
              <div className="flex justify-between"><span>Base Deduction</span><span className="font-medium">{currency(breakdown.bracket.deduction)}</span></div>
              <div className="flex justify-between"><span>Annual PAYE (before rebates)</span><span className="font-medium">{currency(breakdown.annualPAYEBeforeRebate)}</span></div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Rebate Applied</span><span className="font-medium">{breakdown.rebateLabel}</span></div>
              <div className="flex justify-between"><span>Total Rebate</span><span className="font-medium">- {currency(breakdown.totalRebate)}</span></div>
              <div className="flex justify-between"><span>Annual PAYE (after rebates)</span><span className="font-medium">{currency(breakdown.annualPAYEAfterRebate)}</span></div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>De‑annualization Factor</span><span className="font-medium">÷ {breakdown.deAnnualizationFactor}</span></div>
              <div className="flex justify-between"><span>Period PAYE (before rounding)</span><span className="font-medium">{currency(breakdown.periodPayeraw)}</span></div>
              <div className="flex justify-between"><span>Period PAYE (rounded)</span><span className="font-medium">{currency(breakdown.periodPayeRounded)}</span></div>
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>PAYE in this payslip</span><span className="font-medium">{currency(breakdown.payeFromPayslip)}</span></div>
              {!breakdown.applyPayeFlag && (
                <p className="text-xs text-muted-foreground mt-1">
                  Note: PAYE is disabled in settings; the payslip shows R 0.00 even though a computed PAYE value exists.
                </p>
              )}
              {Math.abs(breakdown.payeFromPayslip - breakdown.periodPayeRounded) > 0.01 && (
                <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 p-2 rounded">
                  Heads up: The computed PAYE differs from the payslip's stored PAYE. Check that the active tax year and settings match the payslip's period.
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PayeBreakdownDialog;
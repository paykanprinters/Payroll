"use client";

import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Mail, MessageSquare, Printer } from "lucide-react";
import type { MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";
import type { PayrollRunItem } from "@/integrations/supabase/payroll-run-queries";
import { fetchPayslipsFromSupabase } from "@/integrations/supabase/payslip-queries";
import { sendPayslipEmail, sendPayslipSms } from "@/integrations/supabase/notification-queries";
import { calendarDateFromIso } from "@/lib/payroll-period-guard";
import { payslipsForPayrollRun } from "@/lib/payroll-run-payslips";
import { buildPayslipEmailPayload } from "@/lib/email/build-payslip-email-payload";
import { buildPayslipSmsPayload } from "@/lib/sms/build-payslip-sms-payload";
import { getEmployeeName } from "@/lib/utils";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import { useZipDownload } from "@/hooks/use-zip-download";
import useReportDesignSettings from "@/hooks/use-report-design-settings";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import { showError, showLoading, showSuccess, dismissToast } from "@/utils/toast";

interface RunBulkPayslipMenuProps {
  disabled: boolean;
  periodStart: string;
  periodEnd: string;
  payCycleType: string;
  items: PayrollRunItem[];
  payslips: MockPayslip[];
  employees: MockEmployee[];
  companyDetails: MockCompanyDetails | null;
}

const RunBulkPayslipMenu: React.FC<RunBulkPayslipMenuProps> = ({
  disabled,
  periodStart,
  periodEnd,
  payCycleType,
  items,
  payslips,
  employees,
  companyDetails,
}) => {
  const { downloadZip } = useZipDownload();
  const { openPdf } = usePdfVector();
  const { settings: reportDesignSettings } = useReportDesignSettings();
  const { settings: payslipDesignSettings } = usePayslipDesignSettings();
  const mode: "monthly" | "weekly" = payCycleType === "Monthly" ? "monthly" : "weekly";
  const periodDate = calendarDateFromIso(periodStart);
  const companyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Payroll";
  const nameFor = useCallback(
    (employeeId: string) => getEmployeeName(employeeId, employees),
    [employees]
  );

  const resolveSlips = useCallback(async (): Promise<MockPayslip[]> => {
    const linked = payslipsForPayrollRun(payslips, items, periodStart, periodEnd);
    if (linked.length > 0) return linked;
    const fresh = await fetchPayslipsFromSupabase();
    return payslipsForPayrollRun(fresh, items, periodStart, periodEnd);
  }, [payslips, items, periodStart, periodEnd]);

  const buildDocuments = useCallback(
    async (slips: MockPayslip[]) => {
      const [{ pdf: pdfRenderer }, { default: ReportPdfDocument }, { default: PayslipPdfDocument }] =
        await Promise.all([
          import("@react-pdf/renderer"),
          import("@/components/reports/ReportPdfDocument"),
          import("@/components/payslips/PayslipPdfDocument"),
        ]);
      const reportsDoc = (
        <ReportPdfDocument
          payslips={payslips.length > 0 ? payslips : slips}
          periodPayslips={slips}
          employees={employees}
          companyDetails={companyDetails}
          reportDesignSettings={reportDesignSettings}
          auditLevel="standard"
          selectedDate={periodDate}
          mode={mode}
        />
      );
      const payslipsDoc = (
        <PayslipPdfDocument
          payslips={slips}
          employees={employees}
          companyDetails={companyDetails}
          payslipDesignSettings={payslipDesignSettings}
          getEmployeeName={nameFor}
        />
      );
      const stamp = `${periodStart.slice(0, 10)}-to-${periodEnd.slice(0, 10)}`;
      return { pdfRenderer, reportsDoc, payslipsDoc, stamp };
    },
    [payslips, employees, companyDetails, reportDesignSettings, payslipDesignSettings, periodDate, mode, nameFor, periodStart, periodEnd]
  );

  const handleZip = async () => {
    const slips = await resolveSlips();
    if (slips.length === 0) {
      showError("No payslips on this run yet. Generate items first.");
      return;
    }
    try {
      const { pdfRenderer, reportsDoc, payslipsDoc, stamp } = await buildDocuments(slips);
      const [reportsBlob, payslipsBlob] = await Promise.all([
        pdfRenderer(reportsDoc).toBlob(),
        pdfRenderer(payslipsDoc).toBlob(),
      ]);
      await downloadZip(
        [
          { filename: `reports-${stamp}.pdf`, blob: reportsBlob },
          { filename: `payslips-${stamp}.pdf`, blob: payslipsBlob },
        ],
        `bulk-payslips-${stamp}.zip`
      );
      showSuccess("Reports and payslips downloaded as a ZIP.");
    } catch (error: unknown) {
      showError(`Bulk download failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handlePrint = async () => {
    const slips = await resolveSlips();
    if (slips.length === 0) {
      showError("No payslips on this run yet. Generate items first.");
      return;
    }
    try {
      const { reportsDoc, payslipsDoc, stamp } = await buildDocuments(slips);
      await openPdf(reportsDoc, `reports-${stamp}.pdf`);
      await openPdf(payslipsDoc, `payslips-${stamp}.pdf`);
    } catch (error: unknown) {
      showError(`Bulk print failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleEmail = async () => {
    const slips = await resolveSlips();
    if (slips.length === 0) {
      showError("No payslips on this run yet. Generate items first.");
      return;
    }
    const toastId = showLoading(`Emailing ${slips.length} payslip(s)…`) as string;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    try {
      const [{ pdf: pdfRenderer }, { default: PayslipPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/payslips/PayslipPdfDocument"),
      ]);
      for (const slip of slips) {
        const employee = employees.find((entry) => entry.id === slip.employeeId);
        if (!employee) {
          skipped++;
          continue;
        }
        const built = buildPayslipEmailPayload(employee, slip, companyName);
        if (!built.ok) {
          skipped++;
          continue;
        }
        const blob = await pdfRenderer(
          <PayslipPdfDocument
            payslips={[slip]}
            employees={employees}
            companyDetails={companyDetails}
            payslipDesignSettings={payslipDesignSettings}
            getEmployeeName={nameFor}
          />
        ).toBlob();
        const result = await sendPayslipEmail(built.payload, await blobToBase64(blob));
        if (result.ok) sent++;
        else failed++;
      }
    } catch (error: unknown) {
      showError(`Bulk email failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    } finally {
      dismissToast(toastId);
    }
    const parts = [`Emailed ${sent} payslip(s).`];
    if (skipped) parts.push(`${skipped} skipped (no email).`);
    if (failed) parts.push(`${failed} failed.`);
    if (failed) showError(parts.join(" "));
    else showSuccess(parts.join(" "));
  };

  const handleSms = async () => {
    const slips = await resolveSlips();
    if (slips.length === 0) {
      showError("No payslips on this run yet. Generate items first.");
      return;
    }
    const toastId = showLoading(`Sending ${slips.length} SMS alert(s)…`) as string;
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (const slip of slips) {
        const employee = employees.find((entry) => entry.id === slip.employeeId);
        if (!employee) {
          skipped++;
          continue;
        }
        const built = buildPayslipSmsPayload(employee, slip, companyName);
        if (!built.ok) {
          skipped++;
          continue;
        }
        const result = await sendPayslipSms(built.payload);
        if (result.ok) sent++;
        else failed++;
      }
    } finally {
      dismissToast(toastId);
    }
    const parts = [`Sent ${sent} SMS alert(s).`];
    if (skipped) parts.push(`${skipped} skipped (no mobile).`);
    if (failed) parts.push(`${failed} failed.`);
    if (failed) showError(parts.join(" "));
    else showSuccess(parts.join(" "));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} title={disabled ? "Generate items first." : "Payslips for this run"}>
          Bulk payslips
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={disabled} onSelect={() => void handleZip()}>
          <Download className="mr-2 h-4 w-4" /> Download ZIP
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onSelect={() => void handlePrint()}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onSelect={() => void handleEmail()}>
          <Mail className="mr-2 h-4 w-4" /> Email
        </DropdownMenuItem>
        <DropdownMenuItem disabled={disabled} onSelect={() => void handleSms()}>
          <MessageSquare className="mr-2 h-4 w-4" /> SMS alert
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RunBulkPayslipMenu;

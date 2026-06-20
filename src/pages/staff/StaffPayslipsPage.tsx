"use client";

import React, { useMemo, useState, useCallback } from "react";
import { Loader2, ReceiptText, Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import IndividualPayslipCard from "@/components/payslips/IndividualPayslipCard";
import PayslipPdfDocument from "@/components/payslips/PayslipPdfDocument";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import { usePdfVector } from "@/hooks/use-pdf-vector";
import { formatRand } from "@/lib/staff-portal";
import { resolveCompanyDetailsForPayslipDisplay } from "@/lib/payslip-company-details";
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

const StaffPayslipsPage: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { payslips, employees, companyDetails, isLoadingPayslips } = usePayrollProcessor();
  const { settings: payslipDesignSettings } = usePayslipDesignSettings();
  const { downloadPdf } = usePdfVector();
  const [selectedId, setSelectedId] = useState<string>("");

  const myPayslips = useMemo(
    () =>
      [...payslips.filter((p) => p.employeeId === employee.id)].sort((a, b) =>
        b.payPeriod.localeCompare(a.payPeriod)
      ),
    [employee.id, payslips]
  );

  const selectedPayslip = myPayslips.find((p) => p.id === selectedId) ?? myPayslips[0];

  const displayCompanyDetails = useMemo(
    () =>
      selectedPayslip
        ? resolveCompanyDetailsForPayslipDisplay(selectedPayslip, companyDetails)
        : companyDetails,
    [selectedPayslip, companyDetails]
  );

  React.useEffect(() => {
    if (!selectedId && myPayslips[0]) setSelectedId(myPayslips[0].id);
  }, [myPayslips, selectedId]);

  const getEmployeeName = useCallback(
    (id: string) => {
      const emp = employees.find((e) => e.id === id);
      return emp ? `${emp.firstName} ${emp.lastName}` : "Employee";
    },
    [employees]
  );

  const handleDownload = async () => {
    if (!selectedPayslip) {
      showError("Select a payslip to download.");
      return;
    }
    const doc = (
      <PayslipPdfDocument
        payslips={[selectedPayslip]}
        employees={employees}
        companyDetails={displayCompanyDetails}
        payslipDesignSettings={payslipDesignSettings}
        getEmployeeName={getEmployeeName}
      />
    );
    await downloadPdf(doc, `payslip-${selectedPayslip.payPeriod}.pdf`);
  };

  if (isLoadingPayslips) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">My payslips</h2>
        <p className="text-sm text-muted-foreground">
          View and download your payslip history. New payslips appear here after payroll is finalized.
        </p>
      </div>

      {myPayslips.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <ReceiptText className="h-10 w-10 text-muted-foreground" />
            <p className="mt-4 font-medium">No payslips yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              When payroll is processed for your account, your payslips will show up here automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <Card className="border-cyan-100 xl:max-h-[70vh] xl:overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-base">Pay periods</CardTitle>
              <CardDescription>{myPayslips.length} payslip(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {myPayslips.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left transition-colors",
                    selectedPayslip?.id === p.id
                      ? "border-cyan-300 bg-cyan-50"
                      : "border-slate-100 hover:bg-slate-50"
                  )}
                >
                  <div>
                    <p className="font-medium">{p.payPeriod}</p>
                    <p className="text-xs text-muted-foreground">Net {formatRand(p.netPay)}</p>
                  </div>
                  {p.id === myPayslips[0]?.id && (
                    <Badge className="bg-fuchsia-100 text-fuchsia-800 hover:bg-fuchsia-100">Latest</Badge>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            {selectedPayslip && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedPayslip.payPeriod}</h3>
                    <p className="text-sm text-muted-foreground">
                      Gross {formatRand(selectedPayslip.grossEarnings)} · Net{" "}
                      {formatRand(selectedPayslip.netPay)}
                    </p>
                  </div>
                  <Button onClick={handleDownload} className="bg-cyan-600 hover:bg-cyan-700">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
                <Card className="overflow-hidden border-cyan-100">
                  <CardContent className="flex justify-center p-4 md:p-6">
                    <IndividualPayslipCard
                      payslip={selectedPayslip}
                      payslipDesignSettings={payslipDesignSettings}
                      companyDetails={displayCompanyDetails}
                      employees={employees}
                      getEmployeeName={getEmployeeName}
                      isPdfGeneration={false}
                    />
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPayslipsPage;

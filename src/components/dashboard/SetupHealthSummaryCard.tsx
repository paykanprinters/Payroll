"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CalendarDays, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePayrollProcessor } from "@/context/PayrollDataContext";

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-white",
        ok ? "border-emerald-200 text-emerald-800" : "border-amber-200 text-amber-900"
      )}
    >
      {ok ? "Ready" : "Needs setup"}
    </Badge>
  );
}

const SetupHealthSummaryCard: React.FC = () => {
  const { companyDetails, payCycleSettings, userTaxSettings, taxTables, activeTaxYearForCalculations } =
    usePayrollProcessor({ silent: true });

  const companyNameOk = !!(companyDetails?.companyTradingName || companyDetails?.companyLegalName);
  const payeApplies = userTaxSettings?.applyPaye ?? false;
  const companyTaxOk = !payeApplies ? true : !!companyDetails?.companyTaxNumber;
  const companyOk = companyNameOk && companyTaxOk;

  const payCycleOk = !!payCycleSettings?.payCycleType;

  const taxSettingsOk = !!userTaxSettings;
  const taxTablesOk = !payeApplies
    ? true
    : !!(taxTables && Array.isArray(taxTables.payeBrackets) && taxTables.payeBrackets.length > 0);
  const taxOk = taxSettingsOk && taxTablesOk;

  const rows = [
    {
      key: "company",
      icon: Building2,
      title: "Company",
      ok: companyOk,
      helper: payeApplies ? "Name + tax number" : "Name + details",
      to: "/settings/company-details",
    },
    {
      key: "paycycle",
      icon: CalendarDays,
      title: "Pay cycle",
      ok: payCycleOk,
      helper: "Periods + cut-off",
      to: "/settings/pay-cycle-settings",
    },
    {
      key: "tax",
      icon: ShieldCheck,
      title: "Tax",
      ok: taxOk,
      helper: payeApplies ? `Tables for ${activeTaxYearForCalculations}` : "PAYE/SDL settings",
      to: "/settings/tax-liabilities",
    },
  ];

  const readyCount = rows.filter((r) => r.ok).length;

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Setup status</CardTitle>
        <CardDescription>{readyCount}/3 ready • Finish setup to avoid payroll blockers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => {
          const Icon = r.icon;
          return (
            <div key={r.key} className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white p-2 ring-1 ring-border">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">{r.title}</div>
                    <StatusBadge ok={r.ok} />
                  </div>
                  <div className="text-xs text-muted-foreground">{r.helper}</div>
                </div>
              </div>

              <Link
                to={r.to}
                className={cn(
                  buttonVariants({ variant: r.ok ? "outline" : "default", size: "sm" }),
                  "rounded-full",
                  r.ok && "bg-white"
                )}
              >
                Open
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default SetupHealthSummaryCard;

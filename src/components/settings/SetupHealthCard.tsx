"use client";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Building2, CalendarDays, RefreshCcw, ShieldCheck, ArrowRight } from "lucide-react";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

function StatusBadge({ ok, labelOk = "Ready", labelBad = "Needs setup" }: { ok: boolean; labelOk?: string; labelBad?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-white",
        ok ? "border-emerald-200 text-emerald-800" : "border-amber-200 text-amber-900"
      )}
    >
      {ok ? labelOk : labelBad}
    </Badge>
  );
}

const SetupHealthCard: React.FC = () => {
  const { companyDetails, payCycleSettings, userTaxSettings, taxTables, activeTaxYearForCalculations } = usePayrollProcessor({ silent: true });

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

  const items = useMemo(
    () => [
      {
        key: "company",
        icon: Building2,
        title: "Company details",
        ok: companyOk,
        description: payeApplies
          ? "Company name + tax number are required when PAYE applies."
          : "Company name is used across reports and payslips.",
        href: "/settings/company-details",
        action: "Open",
      },
      {
        key: "pay-cycle",
        icon: CalendarDays,
        title: "Pay cycle",
        ok: payCycleOk,
        description: "Controls cut-off dates, pay periods, and payroll runs.",
        href: "/settings/pay-cycle-settings",
        action: "Configure",
      },
      {
        key: "tax",
        icon: ShieldCheck,
        title: "Tax settings & tables",
        ok: taxOk,
        description: payeApplies
          ? `PAYE is enabled • Tables must be loaded for ${activeTaxYearForCalculations}.`
          : "Enable PAYE/SDL and manage export settings.",
        href: "/settings/tax-liabilities",
        action: payeApplies && !taxTablesOk ? "Fetch tables" : "Open",
      },
    ],
    [companyOk, payCycleOk, taxOk, payeApplies, activeTaxYearForCalculations, taxTablesOk]
  );

  const completed = items.filter((i) => i.ok).length;
  const total = items.length;
  const progress = Math.round((completed / total) * 100);

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-xl">Setup health</CardTitle>
          <CardDescription>
            {completed}/{total} configured. Finish setup to ensure payroll and exports run smoothly.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="bg-white"
            onClick={() => window.dispatchEvent(new Event("appFocusRefresh"))}
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh status
          </Button>
          <Link to="/payroll/runs" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-lg")}> 
            Payroll runs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={progress} className="h-2" />

        <div className="grid gap-3 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="rounded-2xl border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-white p-2 ring-1 ring-border">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium">{item.title}</div>
                        <StatusBadge ok={item.ok} />
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Link to={item.href} className={cn(buttonVariants({ variant: item.ok ? "outline" : "default", size: "sm" }), item.ok ? "bg-white" : "")}> 
                    {item.action}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SetupHealthCard;

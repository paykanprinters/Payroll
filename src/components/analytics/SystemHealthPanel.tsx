"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, ArrowRight, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HealthStatus, SystemHealthReport } from "@/lib/system-health";

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "critical") return <AlertTriangle className="h-4 w-4 text-red-600" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  return <Info className="h-4 w-4 text-sky-600" />;
}

function statusBadgeClass(status: HealthStatus) {
  switch (status) {
    case "ok":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "critical":
      return "border-red-200 bg-red-50 text-red-800";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-900";
    default:
      return "border-sky-200 bg-sky-50 text-sky-800";
  }
}

interface SystemHealthPanelProps {
  report: SystemHealthReport;
}

const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ report }) => {
  const progress = Math.round((report.readyCount / Math.max(report.totalChecks, 1)) * 100);

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-cyan-700" />
          System health
        </CardTitle>
        <CardDescription>
          Payroll readiness across setup, data, tasks, and workflows.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="outline" className={cn("bg-white", statusBadgeClass(report.overall))}>
            {report.overall === "ok"
              ? "Healthy"
              : report.overall === "critical"
                ? "Critical issues"
                : report.overall === "warning"
                  ? "Needs attention"
                  : "Informational"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {report.readyCount}/{report.totalChecks} checks passing
          </span>
        </div>
        <Progress value={progress} className="h-2" />

        <div className="grid gap-2">
          {report.checks.map((check) => (
            <div
              key={check.key}
              className="flex flex-col gap-2 rounded-xl border bg-background px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-2">
                <StatusIcon status={check.status} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{check.title}</p>
                  <p className="text-xs text-muted-foreground">{check.message}</p>
                </div>
              </div>
              {check.actionUrl && (
                <Link
                  to={check.actionUrl}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "shrink-0 rounded-full bg-white"
                  )}
                >
                  Open
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SystemHealthPanel;

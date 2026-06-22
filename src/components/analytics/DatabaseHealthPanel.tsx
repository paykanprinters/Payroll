"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Loader2, RefreshCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DatabaseHealthReport, DatabaseHealthStatus } from "@/lib/database-health";

function overallLabel(status: DatabaseHealthStatus) {
  switch (status) {
    case "healthy":
      return "Healthy";
    case "degraded":
      return "Degraded";
    case "unavailable":
      return "Unavailable";
    case "mock":
      return "Mock mode";
    case "unconfigured":
      return "Not configured";
    default:
      return status;
  }
}

function overallClass(status: DatabaseHealthStatus) {
  switch (status) {
    case "healthy":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "degraded":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "unavailable":
    case "unconfigured":
      return "border-red-200 bg-red-50 text-red-800";
    case "mock":
      return "border-sky-200 bg-sky-50 text-sky-800";
    default:
      return "";
  }
}

function tableStatusClass(status: "ok" | "error" | "skipped") {
  switch (status) {
    case "ok":
      return "border-emerald-200 text-emerald-800";
    case "error":
      return "border-red-200 text-red-800";
    default:
      return "border-muted text-muted-foreground";
  }
}

interface DatabaseHealthPanelProps {
  report: DatabaseHealthReport | null;
  isChecking: boolean;
  onRefresh: () => void;
}

const DatabaseHealthPanel: React.FC<DatabaseHealthPanelProps> = ({
  report,
  isChecking,
  onRefresh,
}) => {
  return (
    <Card className="rounded-xl border">
      <CardHeader className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4 text-cyan-700" />
            Database health
          </CardTitle>
          <CardDescription>
            Lightweight connectivity checks against critical Supabase tables.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isChecking}
          className="rounded-full"
        >
          {isChecking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          Re-check
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!report ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Running database probes…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("bg-white", overallClass(report.overall))}>
                {overallLabel(report.overall)}
              </Badge>
              <span className="text-xs text-muted-foreground">{report.summary}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Last checked {new Date(report.checkedAt).toLocaleString("en-ZA")}
            </p>

            <div className="grid gap-2 sm:grid-cols-2">
              {report.tables.map((row) => (
                <div
                  key={row.table}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{row.label}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.message}</p>
                  </div>
                  <Badge variant="outline" className={cn("shrink-0 bg-white", tableStatusClass(row.status))}>
                    {row.status}
                  </Badge>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DatabaseHealthPanel;

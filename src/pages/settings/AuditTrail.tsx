"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchAuditLogs } from "@/integrations/supabase/audit-queries";
import { buildAuditTrailSummary } from "@/lib/audit-trail-summary";
import { getLocalAuditEvents } from "@/lib/audit-trail";
import AuditTrailFiltersBar from "@/components/settings/audit-trail/AuditTrailFiltersBar";
import AuditTrailTable from "@/components/settings/audit-trail/AuditTrailTable";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import ErrorBoundary from "@/components/ErrorBoundary";

const AuditTrail: React.FC = () => {
  const [severity, setSeverity] = useState("all");
  const [module, setModule] = useState("all");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchAuditLogs>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAuditLogs({
        severity,
        module,
        dateStart,
        dateEnd,
        search,
        limit: 250,
      });

      if (data.length === 0) {
        const local = getLocalAuditEvents().map((e) => ({
          id: e.id,
          userId: e.userId,
          severity: e.severity,
          module: e.module,
          action: e.action,
          message: e.message,
          entityType: e.entityType,
          entityId: e.entityId,
          metadata: e.metadata,
          createdAt: e.createdAt,
          userEmail: e.userEmail,
        }));
        setRows(local);
      } else {
        setRows(data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [severity, module, dateStart, dateEnd, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => buildAuditTrailSummary(rows), [rows]);

  const clearFilters = () => {
    setSeverity("all");
    setModule("all");
    setDateStart("");
    setDateEnd("");
    setSearch("");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Audit trail</h2>
        <p className="text-sm text-muted-foreground">
          Track sign-ins, configuration changes, warnings, alerts, and system errors across the
          payroll platform.
        </p>
      </div>

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Scope events by severity, module, date, or free-text search.</CardDescription>
        </CardHeader>
        <CardContent>
          <AuditTrailFiltersBar
            severity={severity}
            onSeverityChange={setSeverity}
            module={module}
            onModuleChange={setModule}
            dateStart={dateStart}
            onDateStartChange={setDateStart}
            dateEnd={dateEnd}
            onDateEndChange={setDateEnd}
            search={search}
            onSearchChange={setSearch}
            onRefresh={() => void load()}
            onClear={clearFilters}
            isRefreshing={isLoading}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: "Events in view", value: summary.total, variant: "sky" as const },
          { label: "Last 24 hours", value: summary.last24h, variant: "emerald" as const },
          { label: "Auth", value: summary.authEvents, variant: "orange" as const },
          { label: "Changes", value: summary.changes, variant: "amber" as const },
          { label: "Warnings / alerts", value: summary.warnings + summary.alerts, variant: "rose" as const },
          { label: "Errors", value: summary.errors, variant: "rose" as const },
        ].map((item) => (
          <Card key={item.label} className="relative overflow-hidden rounded-xl border">
            <SummaryAccent variant={item.variant} />
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ErrorBoundary fallbackTitle="Audit trail error">
          <AuditTrailTable rows={rows} />
        </ErrorBoundary>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">What gets recorded</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Auth</strong> — user sign-in and sign-out (admin, manager, and staff portals).
            </li>
            <li>
              <strong>Change</strong> — settings updates, leave approvals, payroll run actions, and
              user administration.
            </li>
            <li>
              <strong>Warning / Alert</strong> — operational notices surfaced to administrators.
            </li>
            <li>
              <strong>Error</strong> — client-side failures, API errors, and React error boundaries.
            </li>
          </ul>
          <p className="mt-2">
            Events are stored in Supabase when connected. A local fallback buffer is used when the
            database is unavailable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditTrail;

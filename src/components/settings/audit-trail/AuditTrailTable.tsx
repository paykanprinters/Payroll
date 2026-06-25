"use client";

import React from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollText } from "lucide-react";
import type { AuditLogEntry } from "@/integrations/supabase/audit-queries";
import AuditSeverityBadge from "@/components/settings/audit-trail/AuditSeverityBadge";

interface AuditTrailTableProps {
  rows: AuditLogEntry[];
}

const AuditTrailTable: React.FC<AuditTrailTableProps> = ({ rows }) => {
  if (rows.length === 0) {
    return (
      <Card className="rounded-xl border border-dashed">
        <CardContent className="flex flex-col items-center py-12 text-center">
          <ScrollText className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 font-medium">No audit events match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try widening the date range or clearing filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Event log</CardTitle>
        <CardDescription>
          {rows.length} event{rows.length === 1 ? "" : "s"} in the current view (newest first).
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Module</TableHead>
                <TableHead className="min-w-[220px]">Message</TableHead>
                <TableHead className="hidden md:table-cell">User</TableHead>
                <TableHead className="hidden lg:table-cell">Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {row.createdAt
                      ? format(new Date(row.createdAt), "dd MMM yyyy HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <AuditSeverityBadge severity={row.severity} />
                  </TableCell>
                  <TableCell className="capitalize text-sm">{row.module}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{row.message || row.action}</p>
                    <p className="text-xs text-muted-foreground">{row.action}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    <div className="flex flex-col">
                      <span>{row.userName || "System"}</span>
                      <span className="text-xs text-muted-foreground">{row.userEmail || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                    {row.entityType} / {row.entityId}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditTrailTable;

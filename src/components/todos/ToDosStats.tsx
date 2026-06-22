"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, ListTodo, Info } from "lucide-react";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import type { TodosAdminSummary } from "@/lib/todos-admin-summary";

interface ToDosStatsProps {
  summary: TodosAdminSummary;
}

const ToDosStats: React.FC<ToDosStatsProps> = ({ summary }) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="amber" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <ListTodo className="h-4 w-4 text-amber-600" />
            Pending
          </CardTitle>
          <CardDescription className="text-xs">In view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.pendingInView}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="orange" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Critical
          </CardTitle>
          <CardDescription className="text-xs">Pending severity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.criticalInView}</div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Info className="h-4 w-4 text-sky-600" />
            Warning / info
          </CardTitle>
          <CardDescription className="text-xs">Pending lower priority</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {summary.warningInView + summary.infoInView}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.warningInView} warning · {summary.infoInView} info
          </p>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-xl border bg-white shadow-sm">
        <SummaryAccent variant="emerald" />
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Completed
          </CardTitle>
          <CardDescription className="text-xs">In view</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{summary.completedInView}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToDosStats;

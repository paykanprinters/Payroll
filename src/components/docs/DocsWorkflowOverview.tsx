"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DOCS_WORKFLOW_STEPS, TIMESHEET_STATUS_GUIDE } from "@/lib/docs-content";

const DocsWorkflowOverview: React.FC = () => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Payroll lifecycle</CardTitle>
          <CardDescription>Recommended order of operations each period.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {DOCS_WORKFLOW_STEPS.map((item, index) => (
              <li key={item.step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-xs font-bold text-cyan-800">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.step}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Timesheet statuses</CardTitle>
          <CardDescription>Only Approved and Locked hours drive payslip pay.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {TIMESHEET_STATUS_GUIDE.map((row) => (
            <div key={row.status} className="rounded-lg border bg-muted/30 px-3 py-2">
              <p className="text-sm font-medium">{row.status}</p>
              <p className="text-xs text-muted-foreground">{row.meaning}</p>
              <p className="mt-1 text-xs">
                <span className="font-medium text-foreground">Payroll: </span>
                {row.payroll}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default DocsWorkflowOverview;

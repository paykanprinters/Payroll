"use client";

import React, { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EasyFileValidationReport } from "@/lib/report-generators/easyfile-validation";

interface EasyFileValidationPanelProps {
  validation: EasyFileValidationReport | null | undefined;
  certificateCount?: number;
}

const EasyFileValidationPanel: React.FC<EasyFileValidationPanelProps> = ({
  validation,
  certificateCount = 0,
}) => {
  const [expanded, setExpanded] = useState(false);

  const grouped = useMemo(() => {
    if (!validation) return [];
    const all = [...validation.errors, ...validation.warnings];
    const byEmployee = new Map<string, typeof all>();
    const global: typeof all = [];

    for (const item of all) {
      if (item.employeeName) {
        const key = item.employeeId || item.employeeName;
        const list = byEmployee.get(key) ?? [];
        list.push(item);
        byEmployee.set(key, list);
      } else {
        global.push(item);
      }
    }

    return [
      ...global.map((issues) => ({ label: "Export", issues: [issues] })),
      ...Array.from(byEmployee.entries()).map(([key, issues]) => ({
        label: issues[0]?.employeeName || key,
        issues,
      })),
    ];
  }, [validation]);

  if (!validation || certificateCount === 0) {
    return null;
  }

  const isValid = validation.isValid;

  return (
    <Card className={isValid ? "border-emerald-200 bg-emerald-50/40" : "border-red-200 bg-red-50/40"}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              e@syFile pre-submission check
            </CardTitle>
            <CardDescription className="mt-1">
              {isValid
                ? "All certificates passed import validation. Review warnings before submitting to SARS."
                : "Fix blocking errors before downloading or importing into e@syFile Employer."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={validation.errorCount > 0 ? "destructive" : "secondary"}>
              {validation.errorCount} error{validation.errorCount === 1 ? "" : "s"}
            </Badge>
            <Badge variant="outline">
              {validation.warningCount} warning{validation.warningCount === 1 ? "" : "s"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      {(validation.errors.length > 0 || validation.warnings.length > 0) && (
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <>
                <ChevronUp className="mr-1 h-4 w-4" />
                Hide details
              </>
            ) : (
              <>
                <ChevronDown className="mr-1 h-4 w-4" />
                Show details
              </>
            )}
          </Button>
          {expanded && (
            <ul className="max-h-72 space-y-3 overflow-y-auto text-sm">
              {grouped.map((group) => (
                <li key={group.label} className="rounded-md border bg-background/80 p-3">
                  <p className="font-medium">{group.label}</p>
                  <ul className="mt-2 space-y-1">
                    {group.issues.map((item, index) => (
                      <li
                        key={`${item.code}-${index}`}
                        className={
                          item.severity === "error" ? "text-red-700" : "text-amber-800"
                        }
                      >
                        {item.severity === "warning" ? (
                          <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                        ) : (
                          <XCircle className="mr-1 inline h-3.5 w-3.5" />
                        )}
                        {item.message}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default EasyFileValidationPanel;

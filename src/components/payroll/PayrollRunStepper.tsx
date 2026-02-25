"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export type PayrollRunStepId =
  | "readiness"
  | "items"
  | "review"
  | "approval"
  | "payments"
  | "paid";

type Step = {
  id: PayrollRunStepId;
  label: string;
  helper: string;
};

const steps: Step[] = [
  { id: "readiness", label: "Readiness", helper: "Resolve blockers" },
  { id: "items", label: "Items", helper: "Generate run items" },
  { id: "review", label: "Review", helper: "First checker" },
  { id: "approval", label: "Approve", helper: "Second checker" },
  { id: "payments", label: "Payments", helper: "Create bank batch" },
  { id: "paid", label: "Paid", helper: "Complete run" },
];

export type PayrollRunStepperProps = {
  current: PayrollRunStepId;
  status: string;
  blockersCount: number;
  itemsCount: number;
};

const getIndex = (id: PayrollRunStepId) => steps.findIndex((s) => s.id === id);

const PayrollRunStepper: React.FC<PayrollRunStepperProps> = ({ current, status, blockersCount, itemsCount }) => {
  const currentIdx = getIndex(current);

  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-medium">Workflow</div>
          <div className="text-xs text-muted-foreground">A guided sequence for a clean, auditable payroll run.</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-background">
            Status: <span className="ml-1 font-semibold">{status}</span>
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              "bg-background",
              blockersCount > 0 ? "border-amber-200 text-amber-800" : "border-emerald-200 text-emerald-800"
            )}
          >
            Blockers: <span className="ml-1 font-semibold">{blockersCount}</span>
          </Badge>
          <Badge variant="outline" className="bg-background">
            Items: <span className="ml-1 font-semibold">{itemsCount}</span>
          </Badge>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-6">
        {steps.map((s, idx) => {
          const isActive = idx === currentIdx;
          const isDone = idx < currentIdx;
          return (
            <div
              key={s.id}
              className={cn(
                "rounded-xl border p-3",
                isActive && "border-primary/40 bg-primary/5",
                isDone && !isActive && "bg-muted/40"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{s.label}</div>
                <div
                  className={cn(
                    "text-xs",
                    isActive ? "text-primary" : isDone ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {idx + 1}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{s.helper}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PayrollRunStepper;

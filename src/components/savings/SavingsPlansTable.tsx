"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PauseCircle } from "lucide-react";
import { format } from "date-fns";
import { AdminSavingsPlanRow } from "@/lib/savings-admin-summary";
import { savingsTrackingStatus, statusColorMap } from "@/lib/savings-types";

interface SavingsPlansTableProps {
  rows: AdminSavingsPlanRow[];
  getEmployeeName: (employeeId: string) => string;
  getEmployeeCustomId: (employeeId: string) => string;
  onManage: (row: AdminSavingsPlanRow) => void;
  onDelete: (row: AdminSavingsPlanRow) => void;
}

const SavingsPlansTable: React.FC<SavingsPlansTableProps> = ({
  rows,
  getEmployeeName,
  getEmployeeCustomId,
  onManage,
  onDelete,
}) => {
  if (rows.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No savings plans match your filters.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Schedule</TableHead>
          <TableHead>Saved</TableHead>
          <TableHead>Remaining</TableHead>
          <TableHead>Period</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const { plan, entry } = row;
          const trackingStatus = entry ? savingsTrackingStatus(entry, plan.endDate) : undefined;
          const isPaused = trackingStatus === "paused";

          return (
            <TableRow key={plan.id}>
              <TableCell>
                <p className="font-medium">{getEmployeeName(plan.employeeId)}</p>
                <p className="text-xs text-muted-foreground">{getEmployeeCustomId(plan.employeeId)}</p>
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  R {plan.amount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs capitalize text-muted-foreground">{plan.frequency}</p>
                {entry?.overrideAmount != null && entry.overrideAmount !== entry.originalAmount && (
                  <p className="text-xs text-amber-700">
                    Override: R {entry.overrideAmount.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </p>
                )}
              </TableCell>
              <TableCell>
                {entry ? (
                  `R ${entry.amountPaid.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                ) : (
                  <span className="text-muted-foreground">Not tracked</span>
                )}
              </TableCell>
              <TableCell>
                {!entry ? (
                  <span className="text-muted-foreground">—</span>
                ) : entry.goalAmount == null ? (
                  <span className="text-muted-foreground">No goal</span>
                ) : (
                  `R ${(entry.remainingBalance ?? 0).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`
                )}
              </TableCell>
              <TableCell>
                <p>{format(new Date(plan.startDate), "dd MMM yyyy")}</p>
                <p className="text-xs text-muted-foreground">
                  {plan.endDate ? `Ends ${format(new Date(plan.endDate), "dd MMM yyyy")}` : "Ongoing"}
                </p>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={plan.status === "active" ? "default" : "secondary"} className="capitalize">
                    {plan.status}
                    {isPaused && <PauseCircle className="ml-1 inline h-3 w-3" aria-label="Paused" />}
                  </Badge>
                  {trackingStatus && (
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${statusColorMap[trackingStatus]}`}
                    >
                      {trackingStatus}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => onManage(row)}>
                    Manage
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete savings plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the savings plan for{" "}
                          {getEmployeeName(plan.employeeId)} ({getEmployeeCustomId(plan.employeeId)}).
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onDelete(row)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

export default SavingsPlansTable;

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
import { SavingPlan } from "@/lib/mock-data-interfaces";

interface SavingsPlansTableProps {
  plans: SavingPlan[];
  getEmployeeName: (employeeId: string) => string;
  getEmployeeCustomId: (employeeId: string) => string;
  onManage: (plan: SavingPlan) => void;
  onDelete: (plan: SavingPlan) => void;
}

const SavingsPlansTable: React.FC<SavingsPlansTableProps> = ({
  plans,
  getEmployeeName,
  getEmployeeCustomId,
  onManage,
  onDelete,
}) => {
  if (plans.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No savings plans match your filters.</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee ID</TableHead>
          <TableHead>Employee Name</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Frequency</TableHead>
          <TableHead>Start Date</TableHead>
          <TableHead>End Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {plans.map((plan) => (
          <TableRow key={plan.id}>
            <TableCell>{getEmployeeCustomId(plan.employeeId)}</TableCell>
            <TableCell>{getEmployeeName(plan.employeeId)}</TableCell>
            <TableCell>R {plan.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</TableCell>
            <TableCell>{plan.frequency}</TableCell>
            <TableCell>{plan.startDate}</TableCell>
            <TableCell>{plan.endDate || "N/A"}</TableCell>
            <TableCell>{plan.status}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => onManage(plan)}>
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
                        This action cannot be undone. This will permanently delete the savings plan for {getEmployeeName(plan.employeeId)} ({getEmployeeCustomId(plan.employeeId)}).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(plan)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default SavingsPlansTable;
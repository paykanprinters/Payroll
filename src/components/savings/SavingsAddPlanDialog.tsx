"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MockEmployee, SavingPlan } from "@/lib/mock-data-interfaces";

const savingPlanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.preprocess(
    (val) => (val === "" || val === null || isNaN(Number(val)) ? 0 : Number(val)),
    z.number().min(0.01, "Savings amount must be greater than zero")
  ),
  frequency: z.enum(["monthly", "weekly"], { message: "Deduction frequency is required" }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

type SavingPlanFormValues = z.infer<typeof savingPlanSchema>;

const defaultValues: SavingPlanFormValues = {
  employeeId: "",
  amount: 0,
  frequency: "monthly",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
};

interface SavingsAddPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: MockEmployee[];
  onAddPlan: (plan: Omit<SavingPlan, "id" | "status">) => void;
}

const SavingsAddPlanDialog: React.FC<SavingsAddPlanDialogProps> = ({
  open,
  onOpenChange,
  employees,
  onAddPlan,
}) => {
  const form = useForm<SavingPlanFormValues>({
    resolver: zodResolver(savingPlanSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!open) {
      form.reset(defaultValues);
    }
  }, [open, form]);

  const onSubmit = (data: SavingPlanFormValues) => {
    onAddPlan({
      employeeId: data.employeeId,
      amount: data.amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-[560px]">
        <DialogHeader className="space-y-2 border-b px-6 py-5 text-left">
          <DialogTitle>Add savings plan</DialogTitle>
          <DialogDescription>
            Set up a recurring payroll deduction for an employee. Deductions apply when payslips are
            processed, matched to the employee&apos;s pay frequency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <Select
              onValueChange={(value) => form.setValue("employeeId", value, { shouldValidate: true })}
              value={form.watch("employeeId")}
            >
              <SelectTrigger id="employeeId">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                      {emp.customEmployeeId ? ` • ${emp.customEmployeeId}` : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-employees" disabled>
                    No employees available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <p className="text-sm text-red-600">{form.formState.errors.employeeId.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">Deduction amount (R)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...form.register("amount")}
              />
              <p className="text-xs text-muted-foreground">Per plan frequency below</p>
              {form.formState.errors.amount && (
                <p className="text-sm text-red-600">{form.formState.errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Plan frequency</Label>
              <Select
                onValueChange={(value) =>
                  form.setValue("frequency", value as "monthly" | "weekly", { shouldValidate: true })
                }
                value={form.watch("frequency")}
              >
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.frequency && (
                <p className="text-sm text-red-600">{form.formState.errors.frequency.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">First deduction date</Label>
              <Input id="startDate" type="date" {...form.register("startDate")} />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" type="date" {...form.register("endDate")} />
              <p className="text-xs text-muted-foreground">Leave blank for an ongoing plan</p>
            </div>
          </div>

          <DialogFooter className="gap-2 border-t px-0 pb-0 pt-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Create savings plan</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SavingsAddPlanDialog;

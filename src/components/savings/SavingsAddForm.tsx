"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { MockEmployee, SavingPlan } from "@/lib/mock-data-interfaces";

const savingPlanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  amount: z.preprocess(
    (val) => (val === "" || isNaN(Number(val))) ? 0 : Number(val),
    z.number().min(1, "Savings amount must be positive")
  ),
  frequency: z.enum(["monthly", "weekly"], { message: "Deduction frequency is required" }),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

type SavingPlanFormValues = z.infer<typeof savingPlanSchema>;

interface SavingsAddFormProps {
  employees: MockEmployee[];
  onAddPlan: (plan: Omit<SavingPlan, 'id' | 'status'>) => void;
  onClose?: () => void;
}

const SavingsAddForm: React.FC<SavingsAddFormProps> = ({ employees, onAddPlan, onClose }) => {
  const form = useForm<SavingPlanFormValues>({
    resolver: zodResolver(savingPlanSchema),
    defaultValues: {
      employeeId: "",
      amount: 0,
      frequency: "monthly",
      startDate: new Date().toISOString().split('T')[0],
      endDate: "",
    },
  });

  const onSubmit = (data: SavingPlanFormValues) => {
    const planToSave: Omit<SavingPlan, 'id' | 'status'> = {
      employeeId: data.employeeId,
      amount: data.amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate,
    };
    onAddPlan(planToSave);
    form.reset();
    onClose?.();
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <Label htmlFor="employeeId">Employee</Label>
        <Select
          onValueChange={(value) => form.setValue("employeeId", value)}
          value={form.watch("employeeId")}
        >
          <SelectTrigger id="employeeId" className="mt-1">
            <SelectValue placeholder="Select an employee" />
          </SelectTrigger>
          <SelectContent>
            {employees.length > 0 ? (
              employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName} ({emp.customEmployeeId})
                </SelectItem>
              ))
            ) : (
              <SelectItem value="no-employees" disabled>
                No employees available (enable mock data)
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {form.formState.errors.employeeId && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.employeeId.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="amount">Savings Amount per Period (R)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          {...form.register("amount")}
          className="mt-1"
        />
        {form.formState.errors.amount && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.amount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="frequency">Deduction Frequency</Label>
        <Select
          onValueChange={(value) => form.setValue("frequency", value as "monthly" | "weekly")}
          value={form.watch("frequency")}
        >
          <SelectTrigger id="frequency" className="mt-1">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.frequency && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.frequency.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="startDate">Start Date of Deductions</Label>
        <Input
          id="startDate"
          type="date"
          {...form.register("startDate")}
          className="mt-1"
        />
        {form.formState.errors.startDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="endDate">End Date of Deductions (Optional)</Label>
        <Input
          id="endDate"
          type="date"
          {...form.register("endDate")}
          className="mt-1"
        />
        {form.formState.errors.endDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.endDate.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full">Add Savings Plan</Button>
    </form>
  );
};

export default SavingsAddForm;
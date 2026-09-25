"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Added this import
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { MockEmployee, Loan } from "@/lib/mock-data-interfaces";
import { formatEmployeePickerLabel } from "@/lib/employment-status";

interface LoanFormProps {
  employees: MockEmployee[];
  onAddLoan: (loan: Omit<Loan, 'id' | 'status' | 'remainingBalance' | 'deductionHistory' | 'paused'>) => void;
}

const loanSchema = z.object({
  employeeId: z.string().min(1, "Employee is required"),
  loanType: z.enum(["Personal", "Emergency", "Education", "Other"], { message: "Loan type is required" }),
  loanAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").transform(Number).refine(val => val > 0, "Loan amount must be positive"),
  repaymentAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").transform(Number).refine(val => val > 0, "Repayment amount must be positive"),
  frequency: z.enum(["monthly", "weekly"], { message: "Deduction frequency is required" }),
  startDate: z.date({ required_error: "Start date is required" }),
  notes: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

const LoanForm: React.FC<LoanFormProps> = ({ employees, onAddLoan }) => {
  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      employeeId: "",
      loanType: "Personal",
      loanAmount: 0,
      repaymentAmount: 0,
      frequency: "monthly",
      startDate: undefined,
      notes: "",
    },
  });

  const onSubmit = (data: LoanFormValues) => {
    // Explicitly define the type of newLoan to match what onAddLoan expects
    const newLoan: Omit<Loan, 'id' | 'status' | 'remainingBalance' | 'deductionHistory' | 'paused'> = {
      employeeId: data.employeeId,
      loanType: data.loanType,
      loanAmount: data.loanAmount,
      repaymentAmount: data.repaymentAmount,
      frequency: data.frequency,
      startDate: format(data.startDate, "yyyy-MM-dd"),
      notes: data.notes,
    };
    onAddLoan(newLoan);
    form.reset({
      employeeId: "",
      loanType: "Personal",
      loanAmount: 0,
      repaymentAmount: 0,
      frequency: "monthly",
      startDate: undefined,
      notes: "",
    });
  };

  const startDate = form.watch("startDate");

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
                  {formatEmployeePickerLabel(emp, { includeCode: true })}
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
        <Label htmlFor="loanType">Loan Type</Label>
        <Select
          onValueChange={(value) => form.setValue("loanType", value as Loan["loanType"])}
          value={form.watch("loanType")}
        >
          <SelectTrigger id="loanType" className="mt-1">
            <SelectValue placeholder="Select loan type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Personal">Personal</SelectItem>
            <SelectItem value="Emergency">Emergency</SelectItem>
            <SelectItem value="Education">Education</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        {form.formState.errors.loanType && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.loanType.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="loanAmount">Loan Amount (R)</Label>
        <Input
          id="loanAmount"
          type="number"
          step="0.01"
          {...form.register("loanAmount")}
          className="mt-1"
        />
        {form.formState.errors.loanAmount && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.loanAmount.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="repaymentAmount">Deduction Amount per Cycle (R)</Label>
        <Input
          id="repaymentAmount"
          type="number"
          step="0.01"
          {...form.register("repaymentAmount")}
          className="mt-1"
        />
        {form.formState.errors.repaymentAmount && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.repaymentAmount.message}</p>
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
        <Label htmlFor="startDate">First Deduction Date</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal mt-1",
                !startDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={(date) => form.setValue("startDate", date!)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {form.formState.errors.startDate && (
          <p className="text-red-500 text-sm mt-1">{form.formState.errors.startDate.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Textarea
          id="notes"
          {...form.register("notes")}
          className="mt-1"
          placeholder="e.g., Reason for loan, special terms"
        />
      </div>

      <Button type="submit" className="w-full">Add Loan</Button>
    </form>
  );
};

export default LoanForm;
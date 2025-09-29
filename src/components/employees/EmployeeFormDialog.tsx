"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";

// Define the schema for employee form validation
const employeeSchema = z.object({
  id: z.string().optional(), // ID is optional for new employees
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  jobTitle: z.string().min(1, "Job Title is required"),
  salary: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid salary amount").transform(Number).refine(val => val > 0, "Salary must be positive"),
  startDate: z.string().min(1, "Start Date is required"),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeFormValues) => void;
  initialEmployee?: EmployeeFormValues | null;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
}) => {
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialEmployee || {
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: "",
      salary: 0,
      startDate: new Date().toISOString().split('T')[0], // Default to current date
    },
  });

  React.useEffect(() => {
    if (initialEmployee) {
      form.reset(initialEmployee);
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        salary: 0,
        startDate: new Date().toISOString().split('T')[0],
      });
    }
  }, [initialEmployee, form]);

  const onSubmit = (data: EmployeeFormValues) => {
    onSave(data);
    onClose();
    showSuccess(initialEmployee ? "Employee updated successfully!" : "Employee added successfully!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{initialEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {initialEmployee ? "Make changes to employee details here." : "Fill in the details for the new employee."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">
              First Name
            </Label>
            <Input
              id="firstName"
              {...form.register("firstName")}
              className="col-span-3"
            />
            {form.formState.errors.firstName && (
              <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.firstName.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">
              Last Name
            </Label>
            <Input
              id="lastName"
              {...form.register("lastName")}
              className="col-span-3"
            />
            {form.formState.errors.lastName && (
              <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.lastName.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              className="col-span-3"
            />
            {form.formState.errors.email && (
              <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="jobTitle" className="text-right">
              Job Title
            </Label>
            <Input
              id="jobTitle"
              {...form.register("jobTitle")}
              className="col-span-3"
            />
            {form.formState.errors.jobTitle && (
              <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.jobTitle.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="salary" className="text-right">
              Salary (R)
            </Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              {...form.register("salary", { valueAsNumber: true })}
              className="col-span-3"
            />
            {form.formState.errors.salary && (
              <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.salary.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startDate" className="text-right">
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              {...form.register("startDate")}
              className="col-span-3"
            />
            {form.formState.errors.startDate && (
              <p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.startDate.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit">{initialEmployee ? "Save Changes" : "Add Employee"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
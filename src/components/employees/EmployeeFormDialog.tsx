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
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { MockEmployee } from "@/lib/mock-data-interfaces"; // Updated import

// Define the schema for employee form validation
const employeeSchema = z.object({
  id: z.string().optional(), // ID is optional for new employees
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  jobTitle: z.string().min(1, "Job Title is required"),
  salary: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid salary amount").transform(Number).refine(val => val > 0, "Salary must be positive"),
  startDate: z.string().min(1, "Start Date is required"),
  
  // New fields
  idNumber: z.string().min(1, "ID Number is required").optional(),
  phoneNumber: z.string().min(1, "Phone Number is required").optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  addressLine1: z.string().min(1, "Address Line 1 is required").optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required").optional(),
  province: z.string().min(1, "Province is required").optional(),
  postalCode: z.string().min(1, "Postal Code is required").optional(),
  taxReferenceNumber: z.string().min(1, "Tax Reference Number is required").optional(),
  bankName: z.string().optional(),
  bankAccountHolder: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankBranchCode: z.string().optional(),
  bankAccountType: z.enum(["Cheque", "Savings", "Business"]).optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeFormValues) => void;
  initialEmployee?: MockEmployee | null; // Use MockEmployee interface
}

const provinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape"
];

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
      idNumber: "",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      taxReferenceNumber: "",
      bankName: "",
      bankAccountHolder: "",
      bankAccountNumber: "",
      bankBranchCode: "",
      bankAccountType: "Cheque",
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
        idNumber: "",
        phoneNumber: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        province: "",
        postalCode: "",
        taxReferenceNumber: "",
        bankName: "",
        bankAccountHolder: "",
        bankAccountNumber: "",
        bankBranchCode: "",
        bankAccountType: "Cheque",
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{initialEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {initialEmployee ? "Make changes to employee details here." : "Fill in the details for the new employee."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grid gap-4 py-4 flex-grow pr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal & Employment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal & Employment Details</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="firstName" className="text-right">First Name</Label>
                <Input id="firstName" {...form.register("firstName")} className="col-span-3" />
                {form.formState.errors.firstName && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.firstName.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="lastName" className="text-right">Last Name</Label>
                <Input id="lastName" {...form.register("lastName")} className="col-span-3" />
                {form.formState.errors.lastName && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.lastName.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="idNumber" className="text-right">ID Number</Label>
                <Input id="idNumber" {...form.register("idNumber")} className="col-span-3" />
                {form.formState.errors.idNumber && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.idNumber.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="jobTitle" className="text-right">Job Title</Label>
                <Input id="jobTitle" {...form.register("jobTitle")} className="col-span-3" />
                {form.formState.errors.jobTitle && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.jobTitle.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="salary" className="text-right">Salary (R)</Label>
                <Input id="salary" type="number" step="0.01" {...form.register("salary", { valueAsNumber: true })} className="col-span-3" />
                {form.formState.errors.salary && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.salary.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="startDate" className="text-right">Start Date</Label>
                <Input id="startDate" type="date" {...form.register("startDate")} className="col-span-3" />
                {form.formState.errors.startDate && (<p className className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.startDate.message}</p>)}
              </div>
            </div>

            <Separator />

            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Contact Details</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input id="email" type="email" {...form.register("email")} className="col-span-3" />
                {form.formState.errors.email && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.email.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phoneNumber" className="text-right">Phone Number</Label>
                <Input id="phoneNumber" {...form.register("phoneNumber")} className="col-span-3" />
                {form.formState.errors.phoneNumber && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.phoneNumber.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emergencyContactName" className="text-right">Emergency Contact Name</Label>
                <Input id="emergencyContactName" {...form.register("emergencyContactName")} className="col-span-3" />
                {form.formState.errors.emergencyContactName && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.emergencyContactName.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emergencyContactNumber" className="text-right">Emergency Contact Number</Label>
                <Input id="emergencyContactNumber" {...form.register("emergencyContactNumber")} className="col-span-3" />
                {form.formState.errors.emergencyContactNumber && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.emergencyContactNumber.message}</p>)}
              </div>
            </div>

            <Separator />

            {/* Address Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Address Details</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="addressLine1" className="text-right">Address Line 1</Label>
                <Input id="addressLine1" {...form.register("addressLine1")} className="col-span-3" />
                {form.formState.errors.addressLine1 && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.addressLine1.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="addressLine2" className="text-right">Address Line 2</Label>
                <Input id="addressLine2" {...form.register("addressLine2")} className="col-span-3" />
                {form.formState.errors.addressLine2 && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.addressLine2.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="city" className="text-right">City</Label>
                <Input id="city" {...form.register("city")} className="col-span-3" />
                {form.formState.errors.city && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.city.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="province" className="text-right">Province</Label>
                <Select onValueChange={(value) => form.setValue("province", value)} value={form.watch("province")}>
                  <SelectTrigger id="province" className="col-span-3">
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {provinces.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.province && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.province.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="postalCode" className="text-right">Postal Code</Label>
                <Input id="postalCode" {...form.register("postalCode")} className="col-span-3" />
                {form.formState.errors.postalCode && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.postalCode.message}</p>)}
              </div>
            </div>

            <Separator />

            {/* Tax Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tax Information</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxReferenceNumber" className="text-right">Tax Reference Number</Label>
                <Input id="taxReferenceNumber" {...form.register("taxReferenceNumber")} className="col-span-3" />
                {form.formState.errors.taxReferenceNumber && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.taxReferenceNumber.message}</p>)}
              </div>
            </div>

            <Separator />

            {/* Banking Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Banking Information</h3>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bankName" className="text-right">Bank Name</Label>
                <Input id="bankName" {...form.register("bankName")} className="col-span-3" />
                {form.formState.errors.bankName && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.bankName.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bankAccountHolder" className="text-right">Account Holder</Label>
                <Input id="bankAccountHolder" {...form.register("bankAccountHolder")} className="col-span-3" />
                {form.formState.errors.bankAccountHolder && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.bankAccountHolder.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bankAccountNumber" className="text-right">Account Number</Label>
                <Input id="bankAccountNumber" {...form.register("bankAccountNumber")} className="col-span-3" />
                {form.formState.errors.bankAccountNumber && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.bankAccountNumber.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bankBranchCode" className="text-right">Branch Code</Label>
                <Input id="bankBranchCode" {...form.register("bankBranchCode")} className="col-span-3" />
                {form.formState.errors.bankBranchCode && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.bankBranchCode.message}</p>)}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bankAccountType" className="text-right">Account Type</Label>
                <Select onValueChange={(value) => form.setValue("bankAccountType", value as "Cheque" | "Savings" | "Business")} value={form.watch("bankAccountType")}>
                  <SelectTrigger id="bankAccountType" className="col-span-3">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.bankAccountType && (<p className="col-span-4 text-right text-red-500 text-sm">{form.formState.errors.bankAccountType.message}</p>)}
              </div>
            </div>
          </form>
        </ScrollArea>
        <DialogFooter>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)}>{initialEmployee ? "Save Changes" : "Add Employee"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
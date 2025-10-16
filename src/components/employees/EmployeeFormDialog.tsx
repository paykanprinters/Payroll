"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form"; // Import FormProvider
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Switch } from "@/components/ui/switch"; // Import Switch for Portal Access
import { MockEmployee } from "@/lib/mock-data-interfaces"; // Updated import

// Import new modular components
import BasicInfoForm from "./forms/BasicInfoForm";
import PersonalDetailsForm from "./forms/PersonalDetailsForm";
import PaymentInfoForm from "./forms/PaymentInfoForm";

// Define the schema for employee form validation
const employeeSchema = z.object({
  id: z.string().optional(), // ID is optional for new employees
  personalId: z.string().optional(), // New field for external clock-in system ID
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  jobTitle: z.string().min(1, "Job Title is required"),
  // Updated salary field to use z.preprocess for handling empty strings and then z.number
  salary: z.preprocess(
    (val) => (val === "" || isNaN(Number(val))) ? undefined : val, // Convert empty string OR NaN to undefined
    z.number()
      .min(1, "Salary must be a positive number") // Validate as a number, ensure positive
      .optional() // The field itself is optional
  ),
  // Updated hourlyRate field to use z.preprocess for handling empty strings and then z.number
  hourlyRate: z.preprocess(
    (val) => (val === "" || isNaN(Number(val))) ? undefined : val, // Convert empty string OR NaN to undefined
    z.number()
      .min(1, "Hourly rate must be a positive number") // Validate as a number, ensure positive
      .optional() // The field itself is optional
  ),
  startDate: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().min(1, "Start Date is required")
  ),
  
  // Existing optional fields
  idNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  emergencyContactAddress: z.string().optional(), // New field
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  taxReferenceNumber: z.string().optional(),
  uifNumber: z.string().optional(), // New field
  bankName: z.string().optional(),
  bankAccountHolder: z.string().optional(),
  ibanNumber: z.string().optional(), // Renamed
  routingSwiftCode: z.string().optional(), // Renamed
  bankAccountType: z.enum(["Cheque", "Savings", "Business"]).optional(),

  // New fields from screenshot
  dateOfBirth: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  department: z.string().optional(),
  workLocation: z.string().optional(),
  dateOfConfirmation: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
  originCountry: z.string().optional(),
  employmentType: z.enum(["Permanent", "Contract", "Temporary"]).optional(),
  portalAccess: z.boolean().default(false).optional(),
  permanentAddress: z.string().optional(),
  paymentMode: z.enum(["Bank Transfer", "Cash", "Cheque"]).optional(),
  payFrequency: z.enum(["Monthly", "Weekly", "Bi-Weekly"]).optional(), // New field
  standardDailyHours: z.number().min(1).max(24).optional(), // New field for timesheet
}).superRefine((data, ctx) => {
  if (!data.salary && !data.hourlyRate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either Salary or Hourly Rate must be provided.",
      path: ["salary"],
    });
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Either Salary or Hourly Rate must be provided.",
      path: ["hourlyRate"],
    });
  }
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeFormValues) => void;
  initialEmployee?: MockEmployee | null; // Use MockEmployee interface
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
}) => {
  const formMethods = useForm<EmployeeFormValues>({ // Renamed to formMethods
    resolver: zodResolver(employeeSchema),
    defaultValues: initialEmployee || {
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: "",
      salary: undefined, // Set to undefined for initial state
      hourlyRate: undefined, // Set to undefined for initial state
      startDate: new Date().toISOString().split('T')[0], // Default to current date
      personalId: "", // New default
      idNumber: "",
      phoneNumber: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
      emergencyContactAddress: "", // New default
      addressLine1: "",
      addressLine2: "",
      city: "",
      province: "",
      postalCode: "",
      taxReferenceNumber: "",
      uifNumber: "", // New default
      bankName: "",
      bankAccountHolder: "",
      ibanNumber: "",
      routingSwiftCode: "",
      bankAccountType: "Cheque",
      dateOfBirth: "",
      gender: undefined,
      department: "",
      workLocation: "",
      dateOfConfirmation: "",
      originCountry: "",
      employmentType: undefined,
      portalAccess: false,
      permanentAddress: "",
      paymentMode: "Bank Transfer",
      payFrequency: undefined, // New default
      standardDailyHours: 8, // Default for new employees
    },
  });

  React.useEffect(() => {
    if (initialEmployee) {
      formMethods.reset(initialEmployee);
    } else {
      formMethods.reset({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        salary: undefined,
        hourlyRate: undefined,
        startDate: new Date().toISOString().split('T')[0],
        personalId: "", // New default
        idNumber: "",
        phoneNumber: "",
        emergencyContactName: "",
        emergencyContactNumber: "",
        emergencyContactAddress: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        province: "",
        postalCode: "",
        taxReferenceNumber: "",
        uifNumber: "",
        bankName: "",
        bankAccountHolder: "",
        ibanNumber: "",
        routingSwiftCode: "",
        bankAccountType: "Cheque",
        dateOfBirth: "",
        gender: undefined,
        department: "",
        workLocation: "",
        dateOfConfirmation: "",
        originCountry: "",
        employmentType: undefined,
        portalAccess: false,
        permanentAddress: "",
        paymentMode: "Bank Transfer",
        payFrequency: undefined,
        standardDailyHours: 8, // Default for new employees
      });
    }
  }, [initialEmployee, formMethods]);

  const onSubmit = (data: EmployeeFormValues) => {
    onSave(data);
    onClose();
    showSuccess(initialEmployee ? "Employee updated successfully!" : "Employee added successfully!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{initialEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {initialEmployee ? "Make changes to employee details here." : "Fill in the details for the new employee."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}> {/* Wrap the form with FormProvider */}
          <ScrollArea className="grid gap-4 py-4 flex-grow pr-4">
            <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-6">
              <BasicInfoForm />
              <PersonalDetailsForm />
              <PaymentInfoForm />
            </form>
          </ScrollArea>
        </FormProvider>
        <DialogFooter>
          <Button type="submit" onClick={formMethods.handleSubmit(onSubmit)}>{initialEmployee ? "Save Changes" : "Add Employee"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
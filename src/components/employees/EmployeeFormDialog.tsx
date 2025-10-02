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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { Switch } from "@/components/ui/switch"; // Import Switch for Portal Access
import { MockEmployee } from "@/lib/mock-data-interfaces"; // Updated import

// Define the schema for employee form validation
const employeeSchema = z.object({
  id: z.string().optional(), // ID is optional for new employees
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  jobTitle: z.string().min(1, "Job Title is required"),
  salary: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid salary amount").transform(Number).refine(val => val > 0, "Salary must be positive").optional(),
  hourlyRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount").transform(Number).refine(val => val > 0, "Hourly rate must be positive").optional(), // New field
  startDate: z.string().min(1, "Start Date is required"),
  
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
  dateOfBirth: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),
  department: z.string().optional(),
  workLocation: z.string().optional(),
  dateOfConfirmation: z.string().optional(),
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
      salary: undefined, // Set to undefined for initial state
      hourlyRate: undefined, // Set to undefined for initial state
      startDate: new Date().toISOString().split('T')[0], // Default to current date
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
      form.reset(initialEmployee);
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        salary: undefined,
        hourlyRate: undefined,
        startDate: new Date().toISOString().split('T')[0],
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
  }, [initialEmployee, form]);

  const onSubmit = (data: EmployeeFormValues) => {
    onSave(data);
    onClose();
    showSuccess(initialEmployee ? "Employee updated successfully!" : "Employee added successfully!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] lg:max-w-6xl max-h-[90vh] flex flex-col"> {/* Increased max-w */}
        <DialogHeader>
          <DialogTitle>{initialEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {initialEmployee ? "Make changes to employee details here." : "Fill in the details for the new employee."}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grid gap-4 py-4 flex-grow pr-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...form.register("firstName")} />
                    {form.formState.errors.firstName && (<p className="text-red-500 text-sm">{form.formState.errors.firstName.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...form.register("lastName")} />
                    {form.formState.errors.lastName && (<p className="text-red-500 text-sm">{form.formState.errors.lastName.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="email">Email ID</Label>
                    <Input id="email" type="email" {...form.register("email")} />
                    {form.formState.errors.email && (<p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phoneNumber">Mobile Number</Label>
                    <Input id="phoneNumber" {...form.register("phoneNumber")} />
                    {form.formState.errors.phoneNumber && (<p className="text-red-500 text-sm">{form.formState.errors.phoneNumber.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="startDate">Date of Joining</Label>
                    <Input id="startDate" type="date" {...form.register("startDate")} />
                    {form.formState.errors.startDate && (<p className="text-red-500 text-sm">{form.formState.errors.startDate.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="gender">Gender</Label>
                    <Select onValueChange={(value) => form.setValue("gender", value as "Male" | "Female" | "Other")} value={form.watch("gender")}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.gender && (<p className="text-red-500 text-sm">{form.formState.errors.gender.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="jobTitle">Designation</Label>
                    <Input id="jobTitle" {...form.register("jobTitle")} />
                    {form.formState.errors.jobTitle && (<p className="text-red-500 text-sm">{form.formState.errors.jobTitle.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" {...form.register("department")} />
                    {form.formState.errors.department && (<p className="text-red-500 text-sm">{form.formState.errors.department.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="workLocation">Work Location</Label>
                    <Input id="workLocation" {...form.register("workLocation")} />
                    {form.formState.errors.workLocation && (<p className="text-red-500 text-sm">{form.formState.errors.workLocation.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dateOfConfirmation">Date of Confirmation</Label>
                    <Input id="dateOfConfirmation" type="date" {...form.register("dateOfConfirmation")} />
                    {form.formState.errors.dateOfConfirmation && (<p className="text-red-500 text-sm">{form.formState.errors.dateOfConfirmation.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="originCountry">Origin Country</Label>
                    <Input id="originCountry" {...form.register("originCountry")} />
                    {form.formState.errors.originCountry && (<p className="text-red-500 text-sm">{form.formState.errors.originCountry.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="employmentType">Employment Type</Label>
                    <Select onValueChange={(value) => form.setValue("employmentType", value as "Permanent" | "Contract" | "Temporary")} value={form.watch("employmentType")}>
                      <SelectTrigger id="employmentType">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                        <SelectItem value="Temporary">Temporary</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.employmentType && (<p className="text-red-500 text-sm">{form.formState.errors.employmentType.message}</p>)}
                  </div>
                  <div className="flex items-center space-x-2 col-span-full md:col-span-1">
                    <Switch
                      id="portalAccess"
                      checked={form.watch("portalAccess")}
                      onCheckedChange={(checked) => form.setValue("portalAccess", checked)}
                    />
                    <Label htmlFor="portalAccess">Portal Access</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
                    {form.formState.errors.dateOfBirth && (<p className="text-red-500 text-sm">{form.formState.errors.dateOfBirth.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="idNumber">ID Number</Label>
                    <Input id="idNumber" {...form.register("idNumber")} />
                    {form.formState.errors.idNumber && (<p className="text-red-500 text-sm">{form.formState.errors.idNumber.message}</p>)}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="addressLine1">Residential Address</Label>
                    <Input id="addressLine1" placeholder="Address Line 1" {...form.register("addressLine1")} className="mb-2" />
                    <Input id="addressLine2" placeholder="Address Line 2" {...form.register("addressLine2")} className="mb-2" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input id="city" placeholder="City" {...form.register("city")} />
                      <Select onValueChange={(value) => form.setValue("province", value)} value={form.watch("province")}>
                        <SelectTrigger id="province">
                          <SelectValue placeholder="Select province" />
                        </SelectTrigger>
                        <SelectContent>
                          {provinces.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input id="postalCode" placeholder="Postal Code" {...form.register("postalCode")} className="mt-2" />
                    {(form.formState.errors.addressLine1 || form.formState.errors.city || form.formState.errors.province || form.formState.errors.postalCode) && (
                      <p className="text-red-500 text-sm mt-1">Please complete all address fields.</p>
                    )}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="permanentAddress">Permanent Address</Label>
                    <Textarea id="permanentAddress" {...form.register("permanentAddress")} placeholder="Enter permanent address" rows={4} />
                    {form.formState.errors.permanentAddress && (<p className="text-red-500 text-sm">{form.formState.errors.permanentAddress.message}</p>)}
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="emergencyContactAddress">Emergency Contact Address</Label>
                    <Textarea id="emergencyContactAddress" {...form.register("emergencyContactAddress")} placeholder="Enter emergency contact address" rows={4} />
                    {form.formState.errors.emergencyContactAddress && (<p className="text-red-500 text-sm">{form.formState.errors.emergencyContactAddress.message}</p>)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Payment Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="paymentMode">Payment Mode</Label>
                    <Select onValueChange={(value) => form.setValue("paymentMode", value as "Bank Transfer" | "Cash" | "Cheque")} value={form.watch("paymentMode")}>
                      <SelectTrigger id="paymentMode">
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.paymentMode && (<p className="text-red-500 text-sm">{form.formState.errors.paymentMode.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="payFrequency">Pay Frequency</Label>
                    <Select onValueChange={(value) => form.setValue("payFrequency", value as "Monthly" | "Weekly" | "Bi-Weekly")} value={form.watch("payFrequency")}>
                      <SelectTrigger id="payFrequency">
                        <SelectValue placeholder="Select pay frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.payFrequency && (<p className="text-red-500 text-sm">{form.formState.errors.payFrequency.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="salary">Salary (R)</Label>
                    <Input id="salary" type="number" step="0.01" {...form.register("salary", { valueAsNumber: true })} />
                    {form.formState.errors.salary && (<p className="text-red-500 text-sm">{form.formState.errors.salary.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hourlyRate">Hourly Rate (R)</Label>
                    <Input id="hourlyRate" type="number" step="0.01" {...form.register("hourlyRate", { valueAsNumber: true })} />
                    {form.formState.errors.hourlyRate && (<p className="text-red-500 text-sm">{form.formState.errors.hourlyRate.message}</p>)}
                    <p className="text-xs text-muted-foreground mt-1">
                      Provide either a fixed Salary or an Hourly Rate. In a live system, hourly pay would be calculated based on clock-in/out data.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="standardDailyHours">Standard Daily Hours</Label>
                    <Input id="standardDailyHours" type="number" step="0.01" {...form.register("standardDailyHours", { valueAsNumber: true })} />
                    {form.formState.errors.standardDailyHours && (<p className="text-red-500 text-sm">{form.formState.errors.standardDailyHours.message}</p>)}
                    <p className="text-xs text-muted-foreground mt-1">
                      Used for calculating overtime.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="taxReferenceNumber">Tax Reference Number</Label>
                    <Input id="taxReferenceNumber" {...form.register("taxReferenceNumber")} />
                    {form.formState.errors.taxReferenceNumber && (<p className="text-red-500 text-sm">{form.formState.errors.taxReferenceNumber.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="uifNumber">UIF Number (If applicable)</Label>
                    <Input id="uifNumber" {...form.register("uifNumber")} />
                    {form.formState.errors.uifNumber && (<p className="text-red-500 text-sm">{form.formState.errors.uifNumber.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ibanNumber">IBAN Number</Label>
                    <Input id="ibanNumber" {...form.register("ibanNumber")} />
                    {form.formState.errors.ibanNumber && (<p className="text-red-500 text-sm">{form.formState.errors.ibanNumber.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bankAccountHolder">Account Holder Name</Label>
                    <Input id="bankAccountHolder" {...form.register("bankAccountHolder")} />
                    {form.formState.errors.bankAccountHolder && (<p className="text-red-500 text-sm">{form.formState.errors.bankAccountHolder.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input id="bankName" {...form.register("bankName")} />
                    {form.formState.errors.bankName && (<p className="text-red-500 text-sm">{form.formState.errors.bankName.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="routingSwiftCode">Routing Number / SWIFT Code</Label>
                    <Input id="routingSwiftCode" {...form.register("routingSwiftCode")} />
                    {form.formState.errors.routingSwiftCode && (<p className="text-red-500 text-sm">{form.formState.errors.routingSwiftCode.message}</p>)}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bankAccountType">Account Type</Label>
                    <Select onValueChange={(value) => form.setValue("bankAccountType", value as "Cheque" | "Savings" | "Business")} value={form.watch("bankAccountType")}>
                      <SelectTrigger id="bankAccountType">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                        <SelectItem value="Savings">Savings</SelectItem>
                        <SelectItem value="Business">Business</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.bankAccountType && (<p className="text-red-500 text-sm">{form.formState.errors.bankAccountType.message}</p>)}
                  </div>
                </div>
              </CardContent>
            </Card>
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
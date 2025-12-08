"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateCustomEmployeeId } from "@/lib/utils";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

import BasicInfoForm from "./forms/BasicInfoForm";
import PersonalDetailsForm from "./forms/PersonalDetailsForm";
import PaymentInfoForm from "./forms/PaymentInfoForm";

const employeeSchema = z.object({
  id: z.string().optional(),
  customEmployeeId: z.string().optional(),
  personalId: z.string().optional(),
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  jobTitle: z.string().min(1, "Job Title is required"),
  salary: z.preprocess(
    (val) => {
      if (val === null || val === "") return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number()
      .min(1, "Salary must be a positive number")
      .optional()
  ),
  hourlyRate: z.preprocess(
    (val) => {
      if (val === null || val === "") return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number()
      .min(1, "Hourly rate must be a positive number")
      .optional()
  ),
  startDate: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().min(1, "Start Date is required")
  ),
  
  idNumber: z.string().optional(),
  phoneNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactNumber: z.string().optional(),
  emergencyContactAddress: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  taxReferenceNumber: z.string().optional(),
  uifNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountHolder: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  bankAccountType: z.enum(["Cheque", "Savings", "Business"]).optional(),

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
  payFrequency: z.enum(["Monthly", "Weekly", "Bi-Weekly"]).optional(),
  standardDailyHours: z.number().min(1).max(24).optional(),
  ignoredIncompleteFields: z.array(z.string()).optional(),
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
  initialEmployee?: MockEmployee | null;
}

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
}) => {
  const { employees: allEmployees, companyDetails } = usePayrollProcessor();
  const companyName = companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Acme Corp";

  const formMethods = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialEmployee ? {
      ...initialEmployee,
      customEmployeeId: initialEmployee.customEmployeeId || "",
      originCountry: initialEmployee.originCountry || "",
      employmentType: initialEmployee.employmentType || undefined,
      gender: initialEmployee.gender || undefined,
      payFrequency: initialEmployee.payFrequency || undefined,
      paymentMode: initialEmployee.paymentMode || "Bank Transfer",
      bankAccountType: initialEmployee.bankAccountType || "Cheque",
      portalAccess: initialEmployee.portalAccess ?? false,
      standardDailyHours: initialEmployee.standardDailyHours ?? 8,
      ignoredIncompleteFields: initialEmployee.ignoredIncompleteFields || [],
      // Ensure bank fields align with the form
      bankName: initialEmployee.bankName || "",
      bankAccountHolder: initialEmployee.bankAccountHolder || "",
      accountNumber: initialEmployee.accountNumber || "",
      branchCode: initialEmployee.branchCode || "",
    } : {
      firstName: "",
      lastName: "",
      email: "",
      jobTitle: "",
      salary: undefined,
      hourlyRate: undefined,
      startDate: new Date().toISOString().split('T')[0],
      personalId: "",
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
      accountNumber: "",
      branchCode: "",
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
      standardDailyHours: 8,
      customEmployeeId: "",
      ignoredIncompleteFields: [],
    },
  });

  React.useEffect(() => {
    if (initialEmployee) {
      let customEmployeeIdToUse = initialEmployee.customEmployeeId || "";

      if (!customEmployeeIdToUse) {
        const currentMaxNumber = allEmployees.reduce((max, emp) => {
          if (emp.id === initialEmployee.id) return max;
          const match = emp.customEmployeeId?.match(/\d+$/);
          return match ? Math.max(max, parseInt(match[0])) : max;
        }, 0);
        customEmployeeIdToUse = generateCustomEmployeeId(companyName, currentMaxNumber);
      }

      formMethods.reset({
        ...initialEmployee,
        customEmployeeId: customEmployeeIdToUse,
        originCountry: initialEmployee.originCountry || "",
        employmentType: initialEmployee.employmentType || undefined,
        gender: initialEmployee.gender || undefined,
        payFrequency: initialEmployee.payFrequency || undefined,
        paymentMode: initialEmployee.paymentMode || "Bank Transfer",
        bankAccountType: initialEmployee.bankAccountType || "Cheque",
        portalAccess: initialEmployee.portalAccess ?? false,
        standardDailyHours: initialEmployee.standardDailyHours ?? 8,
        ignoredIncompleteFields: initialEmployee.ignoredIncompleteFields || [],
        // Bank fields aligned
        bankName: initialEmployee.bankName || "",
        bankAccountHolder: initialEmployee.bankAccountHolder || "",
        accountNumber: initialEmployee.accountNumber || "",
        branchCode: initialEmployee.branchCode || "",
      });
    } else {
      const currentMaxNumber = allEmployees.reduce((max, emp) => {
        const match = emp.customEmployeeId?.match(/\d+$/);
        return match ? Math.max(max, parseInt(match[0])) : max;
      }, 0);
      const newCustomEmployeeId = generateCustomEmployeeId(companyName, currentMaxNumber);

      formMethods.reset({
        firstName: "",
        lastName: "",
        email: "",
        jobTitle: "",
        salary: undefined,
        hourlyRate: undefined,
        startDate: new Date().toISOString().split('T')[0],
        personalId: "",
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
        accountNumber: "",
        branchCode: "",
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
        standardDailyHours: 8,
        customEmployeeId: newCustomEmployeeId,
        ignoredIncompleteFields: [],
      });
    }
  }, [initialEmployee, formMethods, allEmployees, companyName]);

  const onSubmit = (data: EmployeeFormValues) => {
    onSave(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-[900px] lg:max-w-6xl max-h-[90vh] h-full flex flex-col">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>{initialEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {initialEmployee ? "Make changes to employee details here." : "Fill in the details for the new employee."}
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(onSubmit)} className="flex flex-col flex-grow overflow-hidden h-full">
            <ScrollArea className="flex-grow px-4 min-h-0">
              <div className="grid gap-4 py-4">
                <BasicInfoForm />
                <PersonalDetailsForm />
                <PaymentInfoForm />
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 px-4">
              <Button type="submit">{initialEmployee ? "Save Changes" : "Add Employee"}</Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
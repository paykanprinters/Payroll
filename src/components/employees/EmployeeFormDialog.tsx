"use client";

import React from "react";
import { useForm, FormProvider, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { showError } from "@/utils/toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateCustomEmployeeId } from "@/lib/utils";
import { Loader2 } from "lucide-react";

import BasicInfoForm from "./forms/BasicInfoForm";
import PersonalDetailsForm from "./forms/PersonalDetailsForm";
import PaymentInfoForm from "./forms/PaymentInfoForm";
import LeaveAccrualForm from "./forms/LeaveAccrualForm";

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
  terminationDate: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
  employmentExitType: z.enum(["Resignation", "Termination"]).optional(),
  employmentExitReason: z.string().optional(),

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
  trackTax: z.boolean().default(true).optional(),
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
  medicalAidMember: z.boolean().default(false).optional(),
  medicalAidDependants: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0, "Dependants cannot be negative").max(30).optional()
  ),
  retirementFundContributionPercent: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0, "Cannot be negative").max(100, "Cannot exceed 100%").optional()
  ),
  retirementFundContributionFixed: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return 0;
      const num = Number(val);
      return isNaN(num) ? 0 : num;
    },
    z.number().min(0, "Cannot be negative").optional()
  ),
  leaveCycleStartDate: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.string().optional()
  ),
  leaveOpeningAnnualBalance: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0, "Cannot be negative").optional()
  ),
  leaveOpeningSickBalance: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0, "Cannot be negative").optional()
  ),
  leaveOpeningFamilyBalance: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0, "Cannot be negative").optional()
  ),
  annualLeaveEntitlementDays: z.preprocess(
    (val) => {
      if (val === null || val === "" || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number().min(0, "Cannot be negative").max(365, "Cannot exceed 365 days").optional()
  ),
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

  const left = data.employmentExitType === "Resignation" || data.employmentExitType === "Termination";
  if (left && !data.terminationDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Last day of employment is required.",
      path: ["terminationDate"],
    });
  }
  if (left && !data.employmentExitReason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A reason is required.",
      path: ["employmentExitReason"],
    });
  }
  if (!left && data.terminationDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose Resignation or Termination, or clear the last day.",
      path: ["employmentExitType"],
    });
  }
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: EmployeeFormValues) => boolean | Promise<boolean>;
  initialEmployee?: MockEmployee | null;
  initialFocus?: "basic" | "personal" | "payment" | "bank" | "tax";
  isSaving?: boolean;
  /** Passed from the parent so the dialog does not subscribe to the full payroll store. */
  allEmployees: MockEmployee[];
  companyName: string;
}

const PERSONAL_TAB_FIELDS = new Set([
  "idNumber",
  "phoneNumber",
  "emergencyContactName",
  "emergencyContactNumber",
  "emergencyContactAddress",
  "addressLine1",
  "addressLine2",
  "city",
  "province",
  "postalCode",
  "dateOfBirth",
  "gender",
  "department",
  "workLocation",
  "dateOfConfirmation",
  "originCountry",
  "employmentType",
  "permanentAddress",
]);

function tabForField(field: string): "basic" | "personal" | "payment" {
  if (PERSONAL_TAB_FIELDS.has(field)) return "personal";
  if (field === "salary" || field === "hourlyRate") return "payment";
  return "basic";
}

const emptyDefaults: EmployeeFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  salary: undefined,
  hourlyRate: undefined,
  startDate: new Date().toISOString().split("T")[0],
  terminationDate: "",
  employmentExitType: undefined,
  employmentExitReason: "",
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
  trackTax: true,
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
  medicalAidMember: false,
  medicalAidDependants: 0,
  retirementFundContributionPercent: 0,
  retirementFundContributionFixed: 0,
  leaveCycleStartDate: "",
  leaveOpeningAnnualBalance: undefined,
  leaveOpeningSickBalance: undefined,
  leaveOpeningFamilyBalance: undefined,
  annualLeaveEntitlementDays: undefined,
  customEmployeeId: "",
  ignoredIncompleteFields: [],
};

const EmployeeFormDialog: React.FC<EmployeeFormDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  initialEmployee,
  initialFocus,
  isSaving = false,
  allEmployees,
  companyName,
}) => {
  const formMethods = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: emptyDefaults,
  });

  const initialTab = React.useMemo(() => {
    if (initialFocus === "personal") return "personal";
    if (initialFocus === "payment" || initialFocus === "bank" || initialFocus === "tax") return "payment";
    return "basic";
  }, [initialFocus]);

  const [tab, setTab] = React.useState<"basic" | "personal" | "payment">(initialTab);
  const formInitKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  React.useEffect(() => {
    if (!isOpen) {
      formInitKeyRef.current = null;
      return;
    }

    const initKey = initialEmployee?.id ?? "__new__";
    if (formInitKeyRef.current === initKey) {
      return;
    }
    formInitKeyRef.current = initKey;

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
        medicalAidMember: initialEmployee.medicalAidMember ?? false,
        medicalAidDependants: initialEmployee.medicalAidDependants ?? 0,
        trackTax: initialEmployee.trackTax ?? true,
        retirementFundContributionPercent: initialEmployee.retirementFundContributionPercent ?? 0,
        retirementFundContributionFixed: initialEmployee.retirementFundContributionFixed ?? 0,
        leaveCycleStartDate: initialEmployee.leaveCycleStartDate || "",
        terminationDate: initialEmployee.terminationDate || "",
        employmentExitType:
          initialEmployee.employmentExitType ||
          (initialEmployee.terminationDate ? "Termination" : undefined),
        employmentExitReason: initialEmployee.employmentExitReason || "",
        leaveOpeningAnnualBalance: initialEmployee.leaveOpeningAnnualBalance,
        leaveOpeningSickBalance: initialEmployee.leaveOpeningSickBalance,
        leaveOpeningFamilyBalance: initialEmployee.leaveOpeningFamilyBalance,
        annualLeaveEntitlementDays: initialEmployee.annualLeaveEntitlementDays,
        ignoredIncompleteFields: initialEmployee.ignoredIncompleteFields || [],
        emergencyContactName: initialEmployee.emergencyContactName || "",
        emergencyContactNumber: initialEmployee.emergencyContactNumber || "",
        emergencyContactAddress: initialEmployee.emergencyContactAddress || "",
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
        ...emptyDefaults,
        customEmployeeId: newCustomEmployeeId,
      });
    }
  }, [isOpen, initialEmployee, formMethods, allEmployees, companyName]);

  const onInvalid = (errors: FieldErrors<EmployeeFormValues>) => {
    const firstField = Object.keys(errors)[0];
    if (firstField) {
      setTab(tabForField(firstField));
    }
    showError("Please complete the required fields highlighted in the form before saving.");
  };

  const onSubmit = async (data: EmployeeFormValues) => {
    const saved = await onSave(data);
    if (saved) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-full max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-[900px] lg:max-w-6xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{initialEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
          <DialogDescription>
            {initialEmployee
              ? "Update employment, personal, and payroll details across the tabs below."
              : "Complete basic details first, then personal and pay information before saving."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "basic" | "personal" | "payment")} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b px-6 py-3">
            <TabsList className="grid w-full grid-cols-3 rounded-xl sm:w-auto">
              <TabsTrigger value="basic" className="rounded-lg">Basic</TabsTrigger>
              <TabsTrigger value="personal" className="rounded-lg">Personal</TabsTrigger>
              <TabsTrigger value="payment" className="rounded-lg">Pay & Bank</TabsTrigger>
            </TabsList>
          </div>

          <FormProvider {...formMethods}>
            <form onSubmit={formMethods.handleSubmit(onSubmit, onInvalid)} className="flex min-h-0 flex-1 flex-col">
              <ScrollArea className="flex-1 px-6">
                <div className="grid gap-4 py-4">
                  <TabsContent value="basic" className="m-0 space-y-4">
                    <BasicInfoForm linkedUserId={initialEmployee?.userId} />
                    <LeaveAccrualForm />
                  </TabsContent>
                  <TabsContent value="personal" className="m-0">
                    <PersonalDetailsForm />
                  </TabsContent>
                  <TabsContent value="payment" className="m-0">
                    <PaymentInfoForm initialFocus={initialFocus} />
                  </TabsContent>
                </div>
              </ScrollArea>

              <DialogFooter className="border-t px-6 py-4">
                <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : initialEmployee ? (
                    "Save Changes"
                  ) : (
                    "Add Employee"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;

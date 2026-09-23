"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

type PaymentInfoFormProps = {
  initialFocus?: "basic" | "personal" | "payment" | "bank" | "tax";
};

const PaymentInfoForm: React.FC<PaymentInfoFormProps> = ({ initialFocus }) => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();

  // Enforce Salary vs Hourly Rate exclusivity in the form
  const salaryValue = watch("salary");
  const hourlyRateValue = watch("hourlyRate");

  React.useEffect(() => {
    if (salaryValue !== undefined && salaryValue !== null && Number(salaryValue) > 0) {
      setValue("hourlyRate", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [salaryValue, setValue]);

  React.useEffect(() => {
    if (hourlyRateValue !== undefined && hourlyRateValue !== null && Number(hourlyRateValue) > 0) {
      setValue("salary", "", { shouldValidate: true, shouldDirty: true });
    }
  }, [hourlyRateValue, setValue]);

  const bankSectionRef = React.useRef<HTMLDivElement | null>(null);
  const taxSectionRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (initialFocus === "bank") {
      bankSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    if (initialFocus === "tax") {
      taxSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [initialFocus]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Pay cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="paymentMode">Payment Mode</Label>
              <Select onValueChange={(value) => setValue("paymentMode", value)} value={watch("paymentMode")}>
                <SelectTrigger id="paymentMode">
                  <SelectValue placeholder="Select payment mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMode && (<p className="text-red-500 text-sm">{errors.paymentMode.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="payFrequency">Pay Frequency</Label>
              <Select onValueChange={(value) => setValue("payFrequency", value)} value={watch("payFrequency")}>
                <SelectTrigger id="payFrequency">
                  <SelectValue placeholder="Select pay frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                </SelectContent>
              </Select>
              {errors.payFrequency && (<p className="text-red-500 text-sm">{errors.payFrequency.message as string}</p>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card ref={bankSectionRef}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Bank details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input id="bankName" {...register("bankName")} />
              {errors.bankName && (<p className="text-red-500 text-sm">{errors.bankName.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="bankAccountHolder">Account Holder Name</Label>
              <Input id="bankAccountHolder" {...register("bankAccountHolder")} />
              {errors.bankAccountHolder && (<p className="text-red-500 text-sm">{errors.bankAccountHolder.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input id="accountNumber" {...register("accountNumber")} />
              {errors.accountNumber && (<p className="text-red-500 text-sm">{errors.accountNumber.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="branchCode">Branch Code</Label>
              <Input id="branchCode" {...register("branchCode")} />
              {errors.branchCode && (<p className="text-red-500 text-sm">{errors.branchCode.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="bankAccountType">Account Type</Label>
              <Select onValueChange={(value) => setValue("bankAccountType", value)} value={watch("bankAccountType")}>
                <SelectTrigger id="bankAccountType">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
              {errors.bankAccountType && (<p className="text-red-500 text-sm">{errors.bankAccountType.message as string}</p>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Compensation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="salary">Salary (R)</Label>
              <Input id="salary" type="number" step="0.01" {...register("salary", { valueAsNumber: true })} />
              {errors.salary && (<p className="text-red-500 text-sm">{errors.salary.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="hourlyRate">Hourly Rate (R)</Label>
              <Input id="hourlyRate" type="number" step="0.01" {...register("hourlyRate", { valueAsNumber: true })} />
              {errors.hourlyRate && (<p className="text-red-500 text-sm">{errors.hourlyRate.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="standardDailyHours">Standard Daily Hours</Label>
              <Input id="standardDailyHours" type="number" step="0.01" {...register("standardDailyHours", { valueAsNumber: true })} />
              {errors.standardDailyHours && (<p className="text-red-500 text-sm">{errors.standardDailyHours.message as string}</p>)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card ref={taxSectionRef}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Tax details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-start gap-2">
            <Checkbox
              id="trackTax"
              checked={watch("trackTax") !== false}
              onCheckedChange={(checked) =>
                setValue("trackTax", checked === true, { shouldDirty: true })
              }
              className="mt-1"
            />
            <div className="grid gap-0.5">
              <Label htmlFor="trackTax">Track tax for this employee</Label>
              <p className="text-xs text-muted-foreground">
                {watch("paymentMode") === "Cash"
                  ? "Cash-paid employees do not need a tax reference or UIF number. When enabled, PAYE/UIF are still calculated and included in company tax totals (employee rows stay hidden on cash-excluded reports)."
                  : "When enabled, PAYE/UIF are calculated on payslips and included in tax reports."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="taxReferenceNumber">
                Tax Reference Number
                {watch("paymentMode") === "Cash" ? (
                  <span className="ml-1 font-normal text-muted-foreground">(optional for cash)</span>
                ) : null}
              </Label>
              <Input id="taxReferenceNumber" {...register("taxReferenceNumber")} />
              {errors.taxReferenceNumber && (<p className="text-red-500 text-sm">{errors.taxReferenceNumber.message as string}</p>)}
            </div>
            <div className="space-y-1">
              <Label htmlFor="uifNumber">
                UIF Number
                {watch("paymentMode") === "Cash" ? (
                  <span className="ml-1 font-normal text-muted-foreground">(optional for cash)</span>
                ) : (
                  <span className="ml-1 font-normal text-muted-foreground">(If applicable)</span>
                )}
              </Label>
              <Input id="uifNumber" {...register("uifNumber")} />
              {errors.uifNumber && (<p className="text-red-500 text-sm">{errors.uifNumber.message as string}</p>)}
            </div>
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="medicalAidMember"
                checked={!!watch("medicalAidMember")}
                onCheckedChange={(checked) => setValue("medicalAidMember", checked === true, { shouldDirty: true })}
                className="mt-1"
              />
              <div className="grid gap-0.5">
                <Label htmlFor="medicalAidMember">Medical scheme member</Label>
                <p className="text-xs text-muted-foreground">
                  Principal member of a registered medical scheme. Enables the SARS Section 6A
                  medical scheme fees tax credit, reducing monthly PAYE.
                </p>
              </div>
            </div>

            {watch("medicalAidMember") && (
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor="medicalAidDependants">Dependants (excluding main member)</Label>
                  <Input
                    id="medicalAidDependants"
                    type="number"
                    min={0}
                    step={1}
                    {...register("medicalAidDependants", { valueAsNumber: true })}
                  />
                  {errors.medicalAidDependants && (
                    <p className="text-red-500 text-sm">{errors.medicalAidDependants.message as string}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 border-t pt-4">
            <div className="grid gap-0.5">
              <Label>Retirement fund contribution (pre-tax)</Label>
              <p className="text-xs text-muted-foreground">
                Employee contribution to a pension / provident / RA fund. Deducted before PAYE,
                limited per SARS Section 11F (27.5% of remuneration, max R350,000/year).
                Set a percentage of gross, a fixed amount, or both.
              </p>
            </div>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="retirementFundContributionPercent">% of gross</Label>
                <Input
                  id="retirementFundContributionPercent"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  {...register("retirementFundContributionPercent", { valueAsNumber: true })}
                />
                {errors.retirementFundContributionPercent && (
                  <p className="text-red-500 text-sm">{errors.retirementFundContributionPercent.message as string}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="retirementFundContributionFixed">Fixed amount (R / period)</Label>
                <Input
                  id="retirementFundContributionFixed"
                  type="number"
                  min={0}
                  step="0.01"
                  {...register("retirementFundContributionFixed", { valueAsNumber: true })}
                />
                {errors.retirementFundContributionFixed && (
                  <p className="text-red-500 text-sm">{errors.retirementFundContributionFixed.message as string}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentInfoForm;
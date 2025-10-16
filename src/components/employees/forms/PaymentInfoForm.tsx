"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PaymentInfoForm: React.FC = () => {
  const { register, control, setValue, watch, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="space-y-1">
            <Label htmlFor="salary">Salary (R)</Label>
            <Input id="salary" type="number" step="0.01" {...register("salary", { valueAsNumber: true })} />
            {errors.salary && (<p className="text-red-500 text-sm">{errors.salary.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="hourlyRate">Hourly Rate (R)</Label>
            <Input id="hourlyRate" type="number" step="0.01" {...register("hourlyRate", { valueAsNumber: true })} />
            {errors.hourlyRate && (<p className="text-red-500 text-sm">{errors.hourlyRate.message as string}</p>)}
            <p className="text-xs text-muted-foreground mt-1">
              Provide either a fixed Salary or an Hourly Rate. In a live system, hourly pay would be calculated based on clock-in/out data.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="standardDailyHours">Standard Daily Hours</Label>
            <Input id="standardDailyHours" type="number" step="0.01" {...register("standardDailyHours", { valueAsNumber: true })} />
            {errors.standardDailyHours && (<p className="text-red-500 text-sm">{errors.standardDailyHours.message as string}</p>)}
            <p className="text-xs text-muted-foreground mt-1">
              Used for calculating overtime.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="taxReferenceNumber">Tax Reference Number</Label>
            <Input id="taxReferenceNumber" {...register("taxReferenceNumber")} />
            {errors.taxReferenceNumber && (<p className="text-red-500 text-sm">{errors.taxReferenceNumber.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="uifNumber">UIF Number (If applicable)</Label>
            <Input id="uifNumber" {...register("uifNumber")} />
            {errors.uifNumber && (<p className="text-red-500 text-sm">{errors.uifNumber.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="ibanNumber">IBAN Number</Label>
            <Input id="ibanNumber" {...register("ibanNumber")} />
            {errors.ibanNumber && (<p className="text-red-500 text-sm">{errors.ibanNumber.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="bankAccountHolder">Account Holder Name</Label>
            <Input id="bankAccountHolder" {...register("bankAccountHolder")} />
            {errors.bankAccountHolder && (<p className="text-red-500 text-sm">{errors.bankAccountHolder.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" {...register("bankName")} />
            {errors.bankName && (<p className="text-red-500 text-sm">{errors.bankName.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="routingSwiftCode">Routing Number / SWIFT Code</Label>
            <Input id="routingSwiftCode" {...register("routingSwiftCode")} />
            {errors.routingSwiftCode && (<p className="text-red-500 text-sm">{errors.routingSwiftCode.message as string}</p>)}
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
  );
};

export default PaymentInfoForm;
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BankingInfoFormProps {
  canEdit: boolean;
}

const BankingInfoForm: React.FC<BankingInfoFormProps> = ({ canEdit }) => {
  const { register, control, setValue, watch, formState: { errors } } = useFormContext();
  const accountType = watch("accountType");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Banking Information</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Bank details for payroll disbursements.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              {...register("bankName")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.bankName && (<p className="text-red-500 text-sm mt-1">{errors.bankName.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="accountholdername">Account Holder Name</Label>
            <Input
              id="accountholdername"
              {...register("accountholdername")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.accountholdername && (<p className="text-red-500 text-sm mt-1">{errors.accountholdername.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              {...register("accountNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.accountNumber && (<p className="text-red-500 text-sm mt-1">{errors.accountNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="branchCode">Branch Code</Label>
            <Input
              id="branchCode"
              {...register("branchCode")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.branchCode && (<p className="text-red-500 text-sm mt-1">{errors.branchCode.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="accountType">Account Type</Label>
            <Select onValueChange={(value) => setValue("accountType", value)} value={accountType} disabled={!canEdit}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select account type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Savings">Savings</SelectItem>
                <SelectItem value="Business">Business</SelectItem>
              </SelectContent>
            </Select>
            {errors.accountType && (<p className="text-red-500 text-sm mt-1">{errors.accountType.message as string}</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BankingInfoForm;
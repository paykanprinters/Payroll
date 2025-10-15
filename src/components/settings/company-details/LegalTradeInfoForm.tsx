"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LegalTradeInfoFormProps {
  canEdit: boolean;
}

const LegalTradeInfoForm: React.FC<LegalTradeInfoFormProps> = ({ canEdit }) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Legal & Trade Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="companyLegalName">Company Legal Name</Label>
            <Input
              id="companyLegalName"
              {...register("companyLegalName")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.companyLegalName && (<p className="text-red-500 text-sm mt-1">{errors.companyLegalName.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="companyTradingName">Company Trading Name</Label>
            <Input
              id="companyTradingName"
              {...register("companyTradingName")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.companyTradingName && (<p className="text-red-500 text-sm mt-1">{errors.companyTradingName.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="companyRegistrationNumber">Company Registration Number</Label>
            <Input
              id="companyRegistrationNumber"
              {...register("companyRegistrationNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.companyRegistrationNumber && (<p className="text-red-500 text-sm mt-1">{errors.companyRegistrationNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="companyTaxNumber">Company Tax Number</Label>
            <Input
              id="companyTaxNumber"
              {...register("companyTaxNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.companyTaxNumber && (<p className="text-red-500 text-sm mt-1">{errors.companyTaxNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="vatRegistrationNumber">VAT Registration Number</Label>
            <Input
              id="vatRegistrationNumber"
              {...register("vatRegistrationNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.vatRegistrationNumber && (<p className="text-red-500 text-sm mt-1">{errors.vatRegistrationNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="industry">Industry / Business Type</Label>
            <Input
              id="industry"
              {...register("industry")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.industry && (<p className="text-red-500 text-sm mt-1">{errors.industry.message as string}</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LegalTradeInfoForm;
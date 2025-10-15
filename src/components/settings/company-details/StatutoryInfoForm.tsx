"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface StatutoryInfoFormProps {
  canEdit: boolean;
}

const StatutoryInfoForm: React.FC<StatutoryInfoFormProps> = ({ canEdit }) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Statutory Registration Numbers (South Africa)</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">These numbers are essential for SARS and other regulatory bodies.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="payeReferenceNumber">PAYE Reference Number</Label>
            <Input
              id="payeReferenceNumber"
              {...register("payeReferenceNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.payeReferenceNumber && (<p className="text-red-500 text-sm mt-1">{errors.payeReferenceNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="uifReferenceNumber">UIF Reference Number</Label>
            <Input
              id="uifReferenceNumber"
              {...register("uifReferenceNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.uifReferenceNumber && (<p className="text-red-500 text-sm mt-1">{errors.uifReferenceNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="sdlReferenceNumber">SDL Reference Number</Label>
            <Input
              id="sdlReferenceNumber"
              {...register("sdlReferenceNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.sdlReferenceNumber && (<p className="text-red-500 text-sm mt-1">{errors.sdlReferenceNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="coidaRegistrationNumber">COIDA Registration Number</Label>
            <Input
              id="coidaRegistrationNumber"
              {...register("coidaRegistrationNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.coidaRegistrationNumber && (<p className="text-red-500 text-sm mt-1">{errors.coidaRegistrationNumber.message as string}</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatutoryInfoForm;
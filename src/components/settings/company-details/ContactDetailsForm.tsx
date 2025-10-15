"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ContactDetailsFormProps {
  canEdit: boolean;
}

const ContactDetailsForm: React.FC<ContactDetailsFormProps> = ({ canEdit }) => {
  const { register, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Company Contact Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="physicalAddress">Physical Address</Label>
            <Textarea
              id="physicalAddress"
              {...register("physicalAddress")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.physicalAddress && (<p className="text-red-500 text-sm mt-1">{errors.physicalAddress.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="postalAddress">Postal Address (if different)</Label>
            <Textarea
              id="postalAddress"
              {...register("postalAddress")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.postalAddress && (<p className="text-red-500 text-sm mt-1">{errors.postalAddress.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="mainContactNumber">Main Contact Number</Label>
            <Input
              id="mainContactNumber"
              {...register("mainContactNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.mainContactNumber && (<p className="text-red-500 text-sm mt-1">{errors.mainContactNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="alternativeContactNumber">Alternative Contact Number</Label>
            <Input
              id="alternativeContactNumber"
              {...register("alternativeContactNumber")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.alternativeContactNumber && (<p className="text-red-500 text-sm mt-1">{errors.alternativeContactNumber.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="companyEmail">Company Email Address</Label>
            <Input
              id="companyEmail"
              type="email"
              {...register("companyEmail")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.companyEmail && (<p className="text-red-500 text-sm mt-1">{errors.companyEmail.message as string}</p>)}
          </div>
          <div>
            <Label htmlFor="companyWebsite">Company Web Address</Label>
            <Input
              id="companyWebsite"
              type="url"
              {...register("companyWebsite")}
              className="mt-1"
              disabled={!canEdit}
            />
            {errors.companyWebsite && (<p className="text-red-500 text-sm mt-1">{errors.companyWebsite.message as string}</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContactDetailsForm;
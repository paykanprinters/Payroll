"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const provinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape"
];

const PersonalDetailsForm: React.FC = () => {
  const { register, control, setValue, watch, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
            {errors.dateOfBirth && (<p className="text-red-500 text-sm">{errors.dateOfBirth.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="personalId">Clock ID (Biometric Personal ID)</Label>
            <Input id="personalId" placeholder="e.g. 3" {...register("personalId")} />
            {errors.personalId && (<p className="text-red-500 text-sm">{errors.personalId.message as string}</p>)}
            <p className="text-xs text-muted-foreground mt-1">
              Must match the number in attendance logs, e.g.{" "}
              <code className="rounded bg-muted px-1">&lt;Attendance&gt;: 3 : …</code>
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="idNumber">ID Number (National ID)</Label>
            <Input id="idNumber" {...register("idNumber")} />
            {errors.idNumber && (<p className="text-red-500 text-sm">{errors.idNumber.message as string}</p>)}
            <p className="text-xs text-muted-foreground mt-1">
              This is the employee's official national identification number.
            </p>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="addressLine1">Residential Address</Label>
            <Input id="addressLine1" placeholder="Address Line 1" {...register("addressLine1")} className="mb-2" />
            <Input id="addressLine2" placeholder="Address Line 2" {...register("addressLine2")} className="mb-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input id="city" placeholder="City" {...register("city")} />
              <Select onValueChange={(value) => setValue("province", value)} value={watch("province")}>
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
            <Input id="postalCode" placeholder="Postal Code" {...register("postalCode")} className="mt-2" />
            {(errors.addressLine1 || errors.city || errors.province || errors.postalCode) && (
              <p className="text-red-500 text-sm mt-1">Please complete all address fields.</p>
            )}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="permanentAddress">Permanent Address</Label>
            <Textarea id="permanentAddress" {...register("permanentAddress")} placeholder="Enter permanent address" rows={4} />
            {errors.permanentAddress && (<p className="text-red-500 text-sm">{errors.permanentAddress.message as string}</p>)}
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="emergencyContactAddress">Emergency Contact Address</Label>
            <Textarea id="emergencyContactAddress" {...register("emergencyContactAddress")} placeholder="Enter emergency contact address" rows={4} />
            {errors.emergencyContactAddress && (<p className="text-red-500 text-sm">{errors.emergencyContactAddress.message as string}</p>)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonalDetailsForm;
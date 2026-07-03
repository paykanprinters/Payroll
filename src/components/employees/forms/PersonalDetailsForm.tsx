"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  isValidSaIdNumber,
  normalizeSaIdNumber,
  parseSaIdNumberDateOfBirth,
} from "@/lib/sa-id-number";

const provinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

const PersonalDetailsForm: React.FC = () => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const idNumber = watch("idNumber") ?? "";
  const dateOfBirth = watch("dateOfBirth") ?? "";
  const [idHint, setIdHint] = React.useState<string | null>(null);

  const applyIdNumber = React.useCallback(
    (raw: string) => {
      const normalized = normalizeSaIdNumber(raw);
      setValue("idNumber", normalized, { shouldDirty: true, shouldValidate: true });

      if (normalized.length < 13) {
        setIdHint(null);
        return;
      }

      const derivedDob = parseSaIdNumberDateOfBirth(normalized);
      if (derivedDob) {
        setValue("dateOfBirth", derivedDob, { shouldDirty: true, shouldValidate: true });
      }

      if (!isValidSaIdNumber(normalized)) {
        setIdHint(
          derivedDob
            ? "ID checksum looks incorrect — date of birth was filled from the first 6 digits. Please verify the number."
            : "This does not look like a valid 13-digit South African ID number.",
        );
      } else {
        setIdHint("Date of birth filled automatically from the ID number.");
      }
    },
    [setValue],
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Identity</CardTitle>
          <CardDescription>Official identifiers used for HR records and compliance.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="idNumber">ID Number (National ID)</Label>
              <Input
                id="idNumber"
                inputMode="numeric"
                autoComplete="off"
                placeholder="13-digit SA ID number"
                maxLength={13}
                {...register("idNumber", {
                  onChange: (event) => applyIdNumber(event.target.value),
                  onBlur: (event) => applyIdNumber(event.target.value),
                })}
              />
              {errors.idNumber && (
                <p className="text-sm text-red-500">{errors.idNumber.message as string}</p>
              )}
              {idHint && !errors.idNumber && (
                <p
                  className={`mt-1 text-xs ${
                    idHint.includes("incorrect") || idHint.includes("does not look")
                      ? "text-amber-700"
                      : "text-muted-foreground"
                  }`}
                >
                  {idHint}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              {errors.dateOfBirth && (
                <p className="text-sm text-red-500">{errors.dateOfBirth.message as string}</p>
              )}
              {dateOfBirth && idNumber.length === 13 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  You can still adjust this manually if needed.
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="personalId">Clock ID (Biometric Personal ID)</Label>
              <Input id="personalId" placeholder="e.g. 3" {...register("personalId")} />
              {errors.personalId && (
                <p className="text-sm text-red-500">{errors.personalId.message as string}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Must match attendance logs, e.g.{" "}
                <code className="rounded bg-muted px-1">&lt;Attendance&gt;: 3 : …</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Residential Address</CardTitle>
          <CardDescription>Current home address used on payslips and reports.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Input id="addressLine1" placeholder="Address Line 1" {...register("addressLine1")} />
            <Input id="addressLine2" placeholder="Address Line 2" {...register("addressLine2")} />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
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
            <Input id="postalCode" placeholder="Postal Code" {...register("postalCode")} />
            {(errors.addressLine1 || errors.city || errors.province || errors.postalCode) && (
              <p className="text-sm text-red-500">Please complete all address fields.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Permanent Address</CardTitle>
          <CardDescription>Use when the permanent address differs from the residential address.</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            id="permanentAddress"
            {...register("permanentAddress")}
            placeholder="Enter permanent address"
            rows={4}
          />
          {errors.permanentAddress && (
            <p className="mt-1 text-sm text-red-500">{errors.permanentAddress.message as string}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Emergency Contact</CardTitle>
          <CardDescription>Person to reach if the employee cannot be contacted at work.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="emergencyContactName">Contact Name</Label>
              <Input
                id="emergencyContactName"
                placeholder="Full name"
                {...register("emergencyContactName")}
              />
              {errors.emergencyContactName && (
                <p className="text-sm text-red-500">{errors.emergencyContactName.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="emergencyContactNumber">Contact Number</Label>
              <Input
                id="emergencyContactNumber"
                placeholder="Mobile or landline"
                {...register("emergencyContactNumber")}
              />
              {errors.emergencyContactNumber && (
                <p className="text-sm text-red-500">{errors.emergencyContactNumber.message as string}</p>
              )}
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="emergencyContactAddress">Contact Address</Label>
              <Textarea
                id="emergencyContactAddress"
                {...register("emergencyContactAddress")}
                placeholder="Street, city, and postal code"
                rows={3}
              />
              {errors.emergencyContactAddress && (
                <p className="text-sm text-red-500">{errors.emergencyContactAddress.message as string}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonalDetailsForm;

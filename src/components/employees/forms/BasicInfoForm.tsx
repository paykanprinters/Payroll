"use client";

import React from "react";
import { Link } from "react-router-dom";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface BasicInfoFormProps {
  linkedUserId?: string | null;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ linkedUserId }) => {
  const { register, setValue, watch, formState: { errors } } = useFormContext();
  const portalAccess = watch("portalAccess");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Employment Details</CardTitle>
          <CardDescription>Core identity and role information for payroll and HR.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="customEmployeeId">Employee ID</Label>
              <Input id="customEmployeeId" {...register("customEmployeeId")} readOnly />
              <p className="mt-1 text-xs text-muted-foreground">
                Company-specific identifier generated automatically.
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-red-500">{errors.firstName.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-red-500">{errors.lastName.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="phoneNumber">Mobile Number</Label>
              <Input id="phoneNumber" {...register("phoneNumber")} />
              {errors.phoneNumber && (
                <p className="text-sm text-red-500">{errors.phoneNumber.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Date of Joining</Label>
              <Input id="startDate" type="date" {...register("startDate")} />
              {errors.startDate && (
                <p className="text-sm text-red-500">{errors.startDate.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="terminationDate">Termination Date</Label>
              <Input id="terminationDate" type="date" {...register("terminationDate")} />
              {errors.terminationDate && (
                <p className="text-sm text-red-500">{errors.terminationDate.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="gender">Gender</Label>
              <Select onValueChange={(value) => setValue("gender", value)} value={watch("gender")}>
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="jobTitle">Designation</Label>
              <Input id="jobTitle" {...register("jobTitle")} />
              {errors.jobTitle && (
                <p className="text-sm text-red-500">{errors.jobTitle.message as string}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="department">Department</Label>
              <Input id="department" {...register("department")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="workLocation">Work Location</Label>
              <Input id="workLocation" {...register("workLocation")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dateOfConfirmation">Date of Confirmation</Label>
              <Input id="dateOfConfirmation" type="date" {...register("dateOfConfirmation")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="originCountry">Origin Country</Label>
              <Input id="originCountry" {...register("originCountry")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="employmentType">Employment Type</Label>
              <Select
                onValueChange={(value) => setValue("employmentType", value)}
                value={watch("employmentType")}
              >
                <SelectTrigger id="employmentType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permanent">Permanent</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Staff Portal</CardTitle>
          <CardDescription>
            Enable portal access here, then link a login account in User Control.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id="portalAccess"
                checked={portalAccess}
                onCheckedChange={(checked) => setValue("portalAccess", checked)}
              />
              <Label htmlFor="portalAccess">Portal access enabled</Label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={portalAccess ? "default" : "secondary"}>
                {portalAccess ? "Enabled" : "Disabled"}
              </Badge>
              <Badge variant={linkedUserId ? "outline" : "secondary"}>
                {linkedUserId ? "Account linked" : "No login linked"}
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {linkedUserId
              ? "This employee is linked to a user account and can sign in when portal access is enabled."
              : "Portal access alone does not create a login. Link this employee to a user in Settings."}
          </p>
          <Link
            to="/settings/user-control-panel"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Open User Control
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasicInfoForm;

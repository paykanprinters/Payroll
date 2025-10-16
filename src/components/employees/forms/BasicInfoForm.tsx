"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

const BasicInfoForm: React.FC = () => {
  const { register, control, setValue, watch, formState: { errors } } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && (<p className="text-red-500 text-sm">{errors.firstName.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && (<p className="text-red-500 text-sm">{errors.lastName.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email ID</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (<p className="text-red-500 text-sm">{errors.email.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="phoneNumber">Mobile Number</Label>
            <Input id="phoneNumber" {...register("phoneNumber")} />
            {errors.phoneNumber && (<p className="text-red-500 text-sm">{errors.phoneNumber.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="startDate">Date of Joining</Label>
            <Input id="startDate" type="date" {...register("startDate")} />
            {errors.startDate && (<p className="text-red-500 text-sm">{errors.startDate.message as string}</p>)}
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
            {errors.gender && (<p className="text-red-500 text-sm">{errors.gender.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="jobTitle">Designation</Label>
            <Input id="jobTitle" {...register("jobTitle")} />
            {errors.jobTitle && (<p className="text-red-500 text-sm">{errors.jobTitle.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="department">Department</Label>
            <Input id="department" {...register("department")} />
            {errors.department && (<p className="text-red-500 text-sm">{errors.department.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="workLocation">Work Location</Label>
            <Input id="workLocation" {...register("workLocation")} />
            {errors.workLocation && (<p className="text-red-500 text-sm">{errors.workLocation.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="dateOfConfirmation">Date of Confirmation</Label>
            <Input id="dateOfConfirmation" type="date" {...register("dateOfConfirmation")} />
            {errors.dateOfConfirmation && (<p className="text-red-500 text-sm">{errors.dateOfConfirmation.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="originCountry">Origin Country</Label>
            <Input id="originCountry" {...register("originCountry")} />
            {errors.originCountry && (<p className="text-red-500 text-sm">{errors.originCountry.message as string}</p>)}
          </div>
          <div className="space-y-1">
            <Label htmlFor="employmentType">Employment Type</Label>
            <Select onValueChange={(value) => setValue("employmentType", value)} value={watch("employmentType")}>
              <SelectTrigger id="employmentType">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Permanent">Permanent</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Temporary">Temporary</SelectItem>
              </SelectContent>
            </Select>
            {errors.employmentType && (<p className="text-red-500 text-sm">{errors.employmentType.message as string}</p>)}
          </div>
          <div className="flex items-center space-x-2 col-span-full md:col-span-1">
            <Switch
              id="portalAccess"
              checked={watch("portalAccess")}
              onCheckedChange={(checked) => setValue("portalAccess", checked)}
            />
            <Label htmlFor="portalAccess">Portal Access</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BasicInfoForm;
"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BCEA_LEAVE_DEFAULTS } from "@/lib/leave-accrual";

const LeaveAccrualForm: React.FC = () => {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Leave accrual (BCEA)</CardTitle>
        <CardDescription>
          Optional overrides for leave balances. Leave blank to use employment start date and default
          entitlements ({BCEA_LEAVE_DEFAULTS.annualWorkingDaysPerCycle} annual days per cycle).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="leaveCycleStartDate">Leave cycle start</Label>
            <Input id="leaveCycleStartDate" type="date" {...register("leaveCycleStartDate")} />
            <p className="text-xs text-muted-foreground">
              Defaults to date of joining when empty.
            </p>
            {errors.leaveCycleStartDate && (
              <p className="text-sm text-red-500">{errors.leaveCycleStartDate.message as string}</p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="annualLeaveEntitlementDays">Annual entitlement (days/cycle)</Label>
            <Input
              id="annualLeaveEntitlementDays"
              type="number"
              step="0.5"
              min="0"
              placeholder={String(BCEA_LEAVE_DEFAULTS.annualWorkingDaysPerCycle)}
              {...register("annualLeaveEntitlementDays", { valueAsNumber: true })}
            />
            {errors.annualLeaveEntitlementDays && (
              <p className="text-sm text-red-500">
                {errors.annualLeaveEntitlementDays.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-3">
            <p className="text-sm font-medium text-foreground">Opening balances (go-live / migration)</p>
            <p className="text-xs text-muted-foreground">
              Credited once in the employee&apos;s first leave cycle. Use when importing existing
              balances.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="leaveOpeningAnnualBalance">Opening annual balance</Label>
            <Input
              id="leaveOpeningAnnualBalance"
              type="number"
              step="0.5"
              min="0"
              {...register("leaveOpeningAnnualBalance", { valueAsNumber: true })}
            />
            {errors.leaveOpeningAnnualBalance && (
              <p className="text-sm text-red-500">
                {errors.leaveOpeningAnnualBalance.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="leaveOpeningSickBalance">Opening sick balance</Label>
            <Input
              id="leaveOpeningSickBalance"
              type="number"
              step="0.5"
              min="0"
              {...register("leaveOpeningSickBalance", { valueAsNumber: true })}
            />
            {errors.leaveOpeningSickBalance && (
              <p className="text-sm text-red-500">
                {errors.leaveOpeningSickBalance.message as string}
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="leaveOpeningFamilyBalance">Opening family responsibility</Label>
            <Input
              id="leaveOpeningFamilyBalance"
              type="number"
              step="0.5"
              min="0"
              {...register("leaveOpeningFamilyBalance", { valueAsNumber: true })}
            />
            {errors.leaveOpeningFamilyBalance && (
              <p className="text-sm text-red-500">
                {errors.leaveOpeningFamilyBalance.message as string}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeaveAccrualForm;

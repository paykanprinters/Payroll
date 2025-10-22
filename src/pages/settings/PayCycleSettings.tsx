"use client";

import React, { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { usePayCycleSettings, PayCycleSettings } from "@/hooks/use-pay-cycle-settings";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

// Define the schema for form validation
const payCycleSchema = z.object({
  payCycleType: z.enum(["Monthly", "Weekly", "Bi-Weekly"], { message: "Pay Cycle Type is required" }),
  cutOffDay: z.number().min(1, "Cut-off day must be at least 1").max(31, "Cut-off day cannot exceed 31"),
  payDayOffset: z.number().min(0, "Pay day offset cannot be negative").max(14, "Pay day offset cannot exceed 14 days"),
});

type PayCycleFormValues = z.infer<typeof payCycleSchema>;

const PayCycleSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { isMockDataEnabled, isAuthenticated, isLoadingAuth } = usePayrollProcessor();
  const { payCycleSettings, isLoadingPayCycleSettings, savePayCycleSettings } = usePayCycleSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const form = useForm<PayCycleFormValues>({
    resolver: zodResolver(payCycleSchema),
    defaultValues: {
      payCycleType: "Weekly",
      cutOffDay: 5, // Friday
      payDayOffset: 0,
    },
  });

  // Load settings from hook into form
  useEffect(() => {
    if (payCycleSettings) {
      form.reset({
        payCycleType: payCycleSettings.payCycleType,
        cutOffDay: payCycleSettings.cutOffDay,
        payDayOffset: payCycleSettings.payDayOffset,
      });
    } else if (!isLoadingPayCycleSettings) {
      // If no settings found and not loading, reset to default form values
      form.reset({
        payCycleType: "Weekly",
        cutOffDay: 5,
        payDayOffset: 0,
      });
    }
  }, [payCycleSettings, isLoadingPayCycleSettings, form]);

  const onSubmit = async (data: PayCycleFormValues) => {
    if (user?.id) {
      const settingsToSave: Omit<PayCycleSettings, 'id' | 'userId'> & { id?: string } = {
        id: payCycleSettings?.id, // Pass existing ID for update
        payCycleType: data.payCycleType,
        cutOffDay: data.cutOffDay,
        payDayOffset: data.payDayOffset,
      };
      await savePayCycleSettings(settingsToSave);
    } else {
      showError("User not authenticated. Cannot save settings.");
    }
  };

  const payCycleType = form.watch("payCycleType");
  const canEdit = user?.role === 'Admin'; // Only Admin can edit settings

  const cutOffDayLabel = useMemo(() => {
    if (payCycleType === "Monthly") {
      return "Cut-off Day of Month (1-31)";
    } else if (payCycleType === "Weekly" || payCycleType === "Bi-Weekly") {
      return "Cut-off Day of Week (1=Mon, 7=Sun)";
    }
    return "Cut-off Day";
  }, [payCycleType]);

  if (isLoadingPayCycleSettings || isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading pay cycle settings...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pay Cycle Settings</CardTitle>
        <CardDescription>
          Define your company's payroll cycle, including the type, cut-off day, and payment offset.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Pay Cycle Type */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Pay Cycle Definition</h3>
            <div>
              <Label htmlFor="payCycleType">Pay Cycle Type</Label>
              <Select
                onValueChange={(value) => form.setValue("payCycleType", value as "Monthly" | "Weekly" | "Bi-Weekly")}
                value={form.watch("payCycleType")}
                disabled={!canEdit}
              >
                <SelectTrigger id="payCycleType" className="mt-1 w-[180px]">
                  <SelectValue placeholder="Select pay cycle type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Weekly">Weekly</SelectItem>
                  <SelectItem value="Bi-Weekly">Bi-Weekly</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.payCycleType && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.payCycleType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="cutOffDay">{cutOffDayLabel}</Label>
              <Input
                id="cutOffDay"
                type="number"
                step="1"
                {...form.register("cutOffDay", { valueAsNumber: true })}
                className="mt-1 w-[180px]"
                disabled={!canEdit}
              />
              {form.formState.errors.cutOffDay && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.cutOffDay.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {payCycleType === "Monthly"
                  ? "e.g., 25 for the 25th of the month."
                  : "e.g., 5 for Friday (1=Monday, 7=Sunday)."}
              </p>
            </div>
            <div>
              <Label htmlFor="payDayOffset">Pay Day Offset (Days after Cut-off)</Label>
              <Input
                id="payDayOffset"
                type="number"
                step="1"
                {...form.register("payDayOffset", { valueAsNumber: true })}
                className="mt-1 w-[180px]"
                disabled={!canEdit}
              />
              {form.formState.errors.payDayOffset && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.payDayOffset.message}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                e.g., 0 for payment on the cut-off day, 3 for payment 3 days after cut-off.
              </p>
            </div>
          </div>

          <Button type="submit" disabled={!canEdit}>Save Pay Cycle Settings</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default PayCycleSettingsPage;
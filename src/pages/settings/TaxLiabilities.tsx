"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

// Define the schema for form validation
const taxLiabilitiesSchema = z.object({
  taxYear: z.string().min(1, "Tax Year is required"),
  applyPAYE: z.boolean().default(false),
  applySDL: z.boolean().default(false),
});

type TaxLiabilitiesFormValues = z.infer<typeof taxLiabilitiesSchema>;

const TaxLiabilities: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const taxYears = [
    (currentYear - 2).toString(),
    (currentYear - 1).toString(),
    currentYear.toString(),
    (currentYear + 1).toString(),
  ];

  const form = useForm<TaxLiabilitiesFormValues>({
    resolver: zodResolver(taxLiabilitiesSchema),
    defaultValues: {
      taxYear: currentYear.toString(), // Default to current year
      applyPAYE: localStorage.getItem('applyPAYE') === 'true',
      applySDL: localStorage.getItem('applySDL') === 'true',
    },
  });

  // Effect to update form defaults when mock data is toggled
  React.useEffect(() => {
    const updateFormDefaults = () => {
      form.reset({
        ...form.getValues(), // Keep current taxYear selection
        applyPAYE: localStorage.getItem('applyPAYE') === 'true',
        applySDL: localStorage.getItem('applySDL') === 'true',
      });
    };

    window.addEventListener('mockDataUpdated', updateFormDefaults);
    updateFormDefaults(); // Call on mount to ensure initial state reflects current localStorage
    return () => {
      window.removeEventListener('mockDataUpdated', updateFormDefaults);
    };
  }, [form]);

  const selectedTaxYear = form.watch("taxYear");

  const handleFetchTaxTables = async () => {
    if (!selectedTaxYear) {
      showError("Please select a tax year to fetch tables.");
      return;
    }

    const toastId = showLoading(`Fetching tax tables for ${selectedTaxYear} from SARS...`);
    console.log(`Attempting to fetch tax tables for year: ${selectedTaxYear}`);

    // Simulate API call to SARS
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulate success or failure
    const isSuccess = Math.random() > 0.3; // 70% chance of success

    dismissToast(toastId);
    if (isSuccess) {
      showSuccess(`Tax tables for ${selectedTaxYear} fetched and applied successfully!`);
      console.log(`Tax tables for ${selectedTaxYear} would now update employee pay structures.`);
    } else {
      showError(`Failed to fetch tax tables for ${selectedTaxYear}. Please check SARS connectivity or try again.`);
    }
  };

  const onSubmitDeductions = async (data: TaxLiabilitiesFormValues) => {
    const toastId = showLoading("Saving authorised deductions settings...");
    console.log("Saving authorised deductions:", { applyPAYE: data.applyPAYE, applySDL: data.applySDL });

    // Simulate saving to backend/local storage
    localStorage.setItem('applyPAYE', data.applyPAYE.toString());
    localStorage.setItem('applySDL', data.applySDL.toString());
    await new Promise(resolve => setTimeout(resolve, 1500));

    dismissToast(toastId);
    showSuccess("Authorised deductions settings saved successfully!");
    console.log(`PAYE applied: ${data.applyPAYE}, SDL applied: ${data.applySDL}. These settings would influence employee salary calculations.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Table Calculations</CardTitle>
          <CardDescription>
            Select a tax year to fetch the latest tax tables from SARS and apply them to employee pay structures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="taxYear">Select Tax Year</Label>
              <Select
                onValueChange={(value) => form.setValue("taxYear", value)}
                defaultValue={form.getValues("taxYear")}
              >
                <SelectTrigger id="taxYear" className="mt-1 w-[180px]">
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.taxYear && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.taxYear.message}</p>
              )}
            </div>
            <Button onClick={handleFetchTaxTables} disabled={!selectedTaxYear}>
              Fetch & Apply Tax Tables
            </Button>
          </div>
          <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
            <h3 className="font-semibold text-lg mb-2">Important Note:</h3>
            <p className="text-sm">
              Fetching live tax tables from SARS and applying complex payroll calculations requires a robust backend system with secure API integrations. This interface provides the UI for selecting the year and triggering the action, but the actual data retrieval and calculation logic would be handled server-side.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Authorised Deductions</CardTitle>
          <CardDescription>
            Enable or disable statutory deductions for employee salaries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmitDeductions)} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyPAYE"
                checked={form.watch("applyPAYE")}
                onCheckedChange={(checked) => form.setValue("applyPAYE", checked as boolean)}
              />
              <Label htmlFor="applyPAYE">
                Apply PAYE (Pay As You Earn)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applySDL"
                checked={form.watch("applySDL")}
                onCheckedChange={(checked) => form.setValue("applySDL", checked as boolean)}
              />
              <Label htmlFor="applySDL">
                Apply SDL (Skills Development Levy)
              </Label>
            </div>
            <Button type="submit">Save Deductions Settings</Button>
          </form>
          <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
            <h3 className="font-semibold text-lg mb-2">Important Note:</h3>
            <p className="text-sm">
              Enabling these deductions here will flag them for application. The actual calculation and deduction from employee salaries would be performed by the backend payroll processing logic.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxLiabilities;
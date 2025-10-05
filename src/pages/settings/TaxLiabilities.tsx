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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider"; // Import Slider
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";

const DEFAULT_IRP5_FONT_SIZE = 12; // Default font size for IRP5 content
const MIN_IRP5_FONT_SIZE = 10;
const MAX_IRP5_FONT_SIZE = 16;

// Define the schema for form validation
const taxLiabilitiesSchema = z.object({
  taxYear: z.string().min(1, "Tax Year is required"),
  applyPAYE: z.boolean().default(false),
  applySDL: z.boolean().default(false),
  enableIrp5Export: z.boolean().default(false),
  irp5ContentFontSize: z.number().min(MIN_IRP5_FONT_SIZE).max(MAX_IRP5_FONT_SIZE).default(DEFAULT_IRP5_FONT_SIZE), // New field
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
      taxYear: currentYear.toString(),
      applyPAYE: localStorage.getItem('applyPAYE') === 'true',
      applySDL: localStorage.getItem('applySDL') === 'true',
      enableIrp5Export: localStorage.getItem('enableIrp5Export') === 'true',
      irp5ContentFontSize: parseFloat(localStorage.getItem('irp5ContentFontSize') || DEFAULT_IRP5_FONT_SIZE.toString()),
    },
  });

  // Effect to update form defaults when mock data is toggled or on initial load
  React.useEffect(() => {
    const updateFormDefaults = () => {
      form.reset({
        ...form.getValues(), // Keep current taxYear selection
        applyPAYE: localStorage.getItem('applyPAYE') === 'true',
        applySDL: localStorage.getItem('applySDL') === 'true',
        enableIrp5Export: localStorage.getItem('enableIrp5Export') === 'true',
        irp5ContentFontSize: parseFloat(localStorage.getItem('irp5ContentFontSize') || DEFAULT_IRP5_FONT_SIZE.toString()),
      });
    };

    window.addEventListener('mockDataUpdated', updateFormDefaults);
    window.addEventListener('irp5SettingsUpdated', updateFormDefaults); // Listen for changes to IRP5 settings
    updateFormDefaults(); // Call on mount to ensure initial state reflects current localStorage
    return () => {
      window.removeEventListener('mockDataUpdated', updateFormDefaults);
      window.removeEventListener('irp5SettingsUpdated', updateFormDefaults);
    };
  }, [form]);

  const selectedTaxYear = form.watch("taxYear");
  const irp5ContentFontSize = form.watch("irp5ContentFontSize");

  const handleFetchTaxTables = async () => {
    if (!selectedTaxYear) {
      showError("Please select a tax year to fetch tables.");
      return;
    }

    const toastId = showLoading(`Fetching tax tables for ${selectedTaxYear} from SARS...`) as string;
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
    const toastId = showLoading("Saving authorised deductions settings...") as string;
    console.log("Saving authorised deductions:", { applyPAYE: data.applyPAYE, applySDL: data.applySDL });

    // Simulate saving to backend/local storage
    localStorage.setItem('applyPAYE', data.applyPAYE.toString());
    localStorage.setItem('applySDL', data.applySDL.toString());
    await new Promise(resolve => setTimeout(resolve, 1500));

    dismissToast(toastId);
    showSuccess("Authorised deductions settings saved successfully!");
    console.log(`PAYE applied: ${data.applyPAYE}, SDL applied: ${data.applySDL}. These settings would influence employee salary calculations.`);
  };

  const handleIrp5ToggleChange = (checked: boolean) => {
    form.setValue("enableIrp5Export", checked);
    localStorage.setItem('enableIrp5Export', checked.toString());
    window.dispatchEvent(new Event('irp5SettingsUpdated')); // Dispatch event
    showSuccess(`IRP5 Export functionality ${checked ? 'enabled' : 'disabled'}.`);
  };

  const handleIrp5FontSizeChange = (value: number[]) => {
    form.setValue("irp5ContentFontSize", value[0]);
    localStorage.setItem('irp5ContentFontSize', value[0].toString());
    window.dispatchEvent(new Event('irp5SettingsUpdated')); // Dispatch event
    showSuccess(`IRP5 content font size set to ${value[0]}px.`);
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

      {/* New Card for IRP5 Export Settings */}
      <Card>
        <CardHeader>
          <CardTitle>IRP5 Export Settings</CardTitle>
          <CardDescription>
            Enable or disable the IRP5 export functionality for employees and adjust text size.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="enableIrp5Export">Enable IRP5 Export</Label>
            <Switch
              id="enableIrp5Export"
              checked={form.watch("enableIrp5Export")}
              onCheckedChange={handleIrp5ToggleChange}
            />
          </div>
          <div>
            <Label htmlFor="irp5ContentFontSize">IRP5 Content Text Size ({irp5ContentFontSize}px)</Label>
            <Slider
              id="irp5ContentFontSize"
              min={MIN_IRP5_FONT_SIZE}
              max={MAX_IRP5_FONT_SIZE}
              step={1}
              value={[irp5ContentFontSize]}
              onValueChange={handleIrp5FontSizeChange}
              className="mt-2"
            />
          </div>
          <div className="mt-8 p-4 border rounded-lg bg-purple-50 text-purple-800">
            <h3 className="font-semibold text-lg mb-2">IRP5 Export Note:</h3>
            <p className="text-sm">
              Enabling this option will make the IRP5 export button visible in the Payslips section. The generated IRP5 is a simplified mock-up for demonstration purposes and does not represent a legally compliant SARS IRP5 certificate. A real IRP5 export requires complex tax calculations and official SARS integration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxLiabilities;
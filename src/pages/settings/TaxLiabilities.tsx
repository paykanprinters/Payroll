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
import { Slider } from "@/components/ui/slider";
import { showSuccess, showError, showLoading, dismissToast } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useUserTaxSettings } from "@/hooks/use-user-tax-settings";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries"; // Corrected import path for UserTaxSettings

const DEFAULT_IRP5_FONT_SIZE = 12; // Default font size for IRP5 content
const MIN_IRP5_FONT_SIZE = 10;
const MAX_IRP5_FONT_SIZE = 16;

// Define the schema for form validation
const taxLiabilitiesSchema = z.object({
  taxYear: z.string().min(1, "Tax Year is required"),
  applyPAYE: z.boolean().default(false),
  applySDL: z.boolean().default(false),
  enableIrp5Export: z.boolean().default(false),
  irp5ContentFontSize: z.number().min(MIN_IRP5_FONT_SIZE).max(MAX_IRP5_FONT_SIZE).default(DEFAULT_IRP5_FONT_SIZE),
});

type TaxLiabilitiesFormValues = z.infer<typeof taxLiabilitiesSchema>;

const TaxLiabilities: React.FC = () => {
  const { user } = useAuth();
  const { isMockDataEnabled, isAuthenticated, isLoadingAuth, setActiveTaxYearForCalculations } = usePayrollProcessor(); // Get setActiveTaxYearForCalculations
  const { userTaxSettings, isLoadingUserTaxSettings, saveUserTaxSettings } = useUserTaxSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const currentYear = new Date().getFullYear();
  const taxYears = [
    (currentYear - 2).toString(),
    (currentYear - 1).toString(),
    currentYear.toString(),
    (currentYear + 1).toString(),
    (currentYear + 2).toString(), // Added 2026
  ];

  const form = useForm<TaxLiabilitiesFormValues>({
    resolver: zodResolver(taxLiabilitiesSchema),
    defaultValues: {
      taxYear: currentYear.toString(),
      applyPAYE: false,
      applySDL: false,
      enableIrp5Export: false,
      irp5ContentFontSize: DEFAULT_IRP5_FONT_SIZE,
    },
  });

  // Load settings from hook into form
  React.useEffect(() => {
    if (userTaxSettings) {
      form.reset({
        taxYear: form.getValues("taxYear"), // Keep current taxYear selection
        applyPAYE: userTaxSettings.applyPaye,
        applySDL: userTaxSettings.applySdl,
        enableIrp5Export: userTaxSettings.enableIrp5Export,
        irp5ContentFontSize: userTaxSettings.irp5ContentFontSize,
      });
    } else if (!isLoadingUserTaxSettings) {
      // If no settings found and not loading, reset to default form values
      form.reset({
        taxYear: currentYear.toString(),
        applyPAYE: false,
        applySDL: false,
        enableIrp5Export: false,
        irp5ContentFontSize: DEFAULT_IRP5_FONT_SIZE,
      });
    }
  }, [userTaxSettings, isLoadingUserTaxSettings, form, currentYear]);

  const selectedTaxYear = form.watch("taxYear");
  const irp5ContentFontSize = form.watch("irp5ContentFontSize");

  const handleFetchTaxTables = async () => {
    if (isMockDataEnabled) {
      showError("Cannot fetch tax tables from SARS when mock data is enabled.");
      return;
    }
    if (!selectedTaxYear) {
      showError("Please select a tax year to fetch tables.");
      return;
    }

    if (user?.role !== 'Admin') {
      showError("Only Admin users can fetch and apply tax tables.");
      return;
    }

    const toastId = showLoading(`Fetching tax tables for ${selectedTaxYear} from SARS...`) as string;
    console.log(`Attempting to fetch tax tables for year: ${selectedTaxYear}`);

    try {
      const { data, error } = await supabase.functions.invoke('fetch-sars-tax-tables', {
        body: JSON.stringify({ taxYear: parseInt(selectedTaxYear) }),
      });

      if (error) {
        console.error('Error invoking fetch-sars-tax-tables Edge Function:', error);
        showError(`Failed to fetch tax tables: ${error.message}`);
      } else {
        console.log('Fetch tax tables Edge Function response:', data);
        showSuccess(`Tax tables for ${selectedTaxYear} fetched and applied successfully!`);
        // NEW: Set the active tax year for calculations
        setActiveTaxYearForCalculations(parseInt(selectedTaxYear));
        // Removed: window.dispatchEvent(new Event('taxTablesUpdated'));
      }
    } catch (error: any) {
      console.error('Error calling fetch-sars-tax-tables Edge Function:', error);
      showError(`An unexpected error occurred: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const onSubmitDeductions = async (data: TaxLiabilitiesFormValues) => {
    if (user?.id) {
      const settingsToSave: Omit<UserTaxSettings, 'id' | 'userId'> & { id?: string } = {
        id: userTaxSettings?.id,
        applyPaye: data.applyPAYE,
        applySdl: data.applySDL,
        enableIrp5Export: data.enableIrp5Export, // Ensure this is included
        irp5ContentFontSize: data.irp5ContentFontSize, // Ensure this is included
      };
      await saveUserTaxSettings(settingsToSave);
    } else {
      showError("User not authenticated. Cannot save authorised deductions settings.");
    }
  };

  const handleIrp5ToggleChange = async (checked: boolean) => {
    if (user?.id) {
      const settingsToSave: Omit<UserTaxSettings, 'id' | 'userId'> & { id?: string } = {
        id: userTaxSettings?.id,
        applyPaye: form.getValues("applyPAYE"),
        applySdl: form.getValues("applySDL"),
        enableIrp5Export: checked,
        irp5ContentFontSize: form.getValues("irp5ContentFontSize"), // Ensure this is included
      };
      await saveUserTaxSettings(settingsToSave);
    } else {
      showError("User not authenticated. Cannot change IRP5 export settings.");
    }
  };

  const handleIrp5FontSizeChange = async (value: number[]) => {
    if (user?.id) {
      const settingsToSave: Omit<UserTaxSettings, 'id' | 'userId'> & { id?: string } = {
        id: userTaxSettings?.id,
        applyPaye: form.getValues("applyPAYE"),
        applySdl: form.getValues("applySDL"),
        enableIrp5Export: form.getValues("enableIrp5Export"),
        irp5ContentFontSize: value[0],
      };
      await saveUserTaxSettings(settingsToSave);
    } else {
      showError("User not authenticated. Cannot change IRP5 font size settings.");
    }
  };

  const canManageTaxSettings = user?.role === 'Admin';

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
                disabled={!canManageTaxSettings || isMockDataEnabled}
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
            <Button onClick={handleFetchTaxTables} disabled={!selectedTaxYear || !canManageTaxSettings || isMockDataEnabled}>
              Fetch & Apply Tax Tables
            </Button>
          </div>
          <div className="mt-8 p-4 border rounded-lg bg-yellow-50 text-yellow-800">
            <h3 className="font-semibold text-lg mb-2">Important Note:</h3>
            <p className="text-sm">
              This demonstration uses **mock SARS tax data** for various years. For a production system, fetching and applying legally compliant tax tables from SARS requires a robust backend system with secure API integrations to official data sources. This interface provides the UI for selecting the year and triggering the action, but the actual data retrieval and calculation logic would be handled server-side.
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
                disabled={!canManageTaxSettings || isMockDataEnabled}
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
                disabled={!canManageTaxSettings || isMockDataEnabled}
              />
              <Label htmlFor="applySDL">
                Apply SDL (Skills Development Levy)
              </Label>
            </div>
            <Button type="submit" disabled={!canManageTaxSettings || isMockDataEnabled}>Save Deductions Settings</Button>
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
              disabled={!canManageTaxSettings || isMockDataEnabled}
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
              disabled={!canManageTaxSettings || isMockDataEnabled}
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
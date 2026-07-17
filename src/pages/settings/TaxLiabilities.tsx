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
import { logger, toLogError } from "@/lib/logger";
import { useAuth } from "@/hooks/use-auth";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useUserTaxSettings } from "@/hooks/use-user-tax-settings";
import { UserTaxSettings } from "@/integrations/supabase/user-tax-settings-queries"; // Corrected import path for UserTaxSettings
import { getSarsTaxTablesForYear, SUPPORTED_SARS_TAX_YEARS } from "@/lib/sars-tax-tables";
import {
  getTaxTableStatusLabel,
  validateLoadedTaxTables,
} from "@/lib/tax-tables-validation";

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
  proRateUifCapByFrequency: z.boolean().default(false), // NEW
  applyMedicalAidTaxCredit: z.boolean().default(true), // COMP-07
});

type TaxLiabilitiesFormValues = z.infer<typeof taxLiabilitiesSchema>;

const TaxLiabilities: React.FC = () => {
  const { user } = useAuth();
  const { isMockDataEnabled, isAuthenticated, isLoadingAuth, activeTaxYearForCalculations, setActiveTaxYearForCalculations, taxTables, taxTableValidation, isLoadingTaxTables, refetchTaxTables } = usePayrollProcessor(); // include activeTaxYearForCalculations
  const { userTaxSettings, isLoadingUserTaxSettings, saveUserTaxSettings } = useUserTaxSettings({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const taxYears = SUPPORTED_SARS_TAX_YEARS.map(String);

  const form = useForm<TaxLiabilitiesFormValues>({
    resolver: zodResolver(taxLiabilitiesSchema),
    defaultValues: {
      taxYear: activeTaxYearForCalculations.toString(),
      applyPAYE: false,
      applySDL: false,
      enableIrp5Export: false,
      irp5ContentFontSize: DEFAULT_IRP5_FONT_SIZE,
      proRateUifCapByFrequency: false, // NEW default
      applyMedicalAidTaxCredit: true, // COMP-07 default
    },
  });

  // Load settings from hook into form
  React.useEffect(() => {
    if (userTaxSettings) {
      form.reset({
        taxYear: activeTaxYearForCalculations.toString(),
        applyPAYE: userTaxSettings.applyPaye,
        applySDL: userTaxSettings.applySdl,
        enableIrp5Export: userTaxSettings.enableIrp5Export,
        irp5ContentFontSize: userTaxSettings.irp5ContentFontSize,
        proRateUifCapByFrequency: userTaxSettings.proRateUifCapByFrequency ?? false, // NEW
        applyMedicalAidTaxCredit: userTaxSettings.applyMedicalAidTaxCredit ?? true, // COMP-07
      });
    } else if (!isLoadingUserTaxSettings) {
      form.reset({
        taxYear: activeTaxYearForCalculations.toString(),
        applyPAYE: false,
        applySDL: false,
        enableIrp5Export: false,
        irp5ContentFontSize: DEFAULT_IRP5_FONT_SIZE,
        proRateUifCapByFrequency: false, // NEW
        applyMedicalAidTaxCredit: true, // COMP-07
      });
    }
  }, [userTaxSettings, isLoadingUserTaxSettings, form, activeTaxYearForCalculations]);

  // Keep form taxYear in sync with the active year for calculations
  React.useEffect(() => {
    const activeStr = activeTaxYearForCalculations.toString();
    if (form.getValues("taxYear") !== activeStr) {
      form.setValue("taxYear", activeStr);
    }
  }, [activeTaxYearForCalculations, form]);

  const selectedTaxYear = form.watch("taxYear");
  const selectedYearMeta = selectedTaxYear ? getSarsTaxTablesForYear(parseInt(selectedTaxYear, 10)) : null;
  const selectedYearNum = selectedTaxYear ? parseInt(selectedTaxYear, 10) : activeTaxYearForCalculations;
  const tableStatusForSelectedYear = React.useMemo(() => {
    if (selectedYearNum === activeTaxYearForCalculations) {
      return (
        taxTableValidation ??
        validateLoadedTaxTables(taxTables, selectedYearNum, { isLoading: isLoadingTaxTables })
      );
    }
    return validateLoadedTaxTables(null, selectedYearNum);
  }, [
    selectedYearNum,
    activeTaxYearForCalculations,
    taxTableValidation,
    taxTables,
    isLoadingTaxTables,
  ]);
  const irp5ContentFontSize = form.watch("irp5ContentFontSize");

  const handleFetchTaxTables = async () => {
    if (!selectedTaxYear) {
      showError("Please select a tax year to fetch tables.");
      return;
    }

    if (user?.role !== 'Admin') {
      showError("Only Admin users can fetch and apply tax tables.");
      return;
    }

    const toastId = showLoading(`Applying SARS tax tables for ${selectedTaxYear}...`) as string;

    try {
      const { data, error } = await supabase.functions.invoke("fetch-sars-tax-tables", {
        body: { taxYear: parseInt(selectedTaxYear, 10) },
      });

      if (error) {
        logger.error('Error invoking fetch-sars-tax-tables Edge Function:', toLogError(error));
        showError(`Failed to fetch tax tables: ${toLogError(error)}`);
      } else {
        showSuccess(`Tax tables for ${selectedTaxYear} fetched and applied successfully!`);
        setActiveTaxYearForCalculations(parseInt(selectedTaxYear, 10));
        await refetchTaxTables(parseInt(selectedTaxYear, 10));
        window.dispatchEvent(new Event('taxTablesUpdated'));
      }
    } catch (error: unknown) {
      logger.error('Error calling fetch-sars-tax-tables Edge Function:', toLogError(error));
      showError(`An unexpected error occurred: ${toLogError(error)}`);
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
        enableIrp5Export: data.enableIrp5Export,
        irp5ContentFontSize: data.irp5ContentFontSize,
        proRateUifCapByFrequency: data.proRateUifCapByFrequency, // NEW
        applyMedicalAidTaxCredit: data.applyMedicalAidTaxCredit, // COMP-07
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

  const handleProRateUifToggleChange = async (checked: boolean) => {
    if (user?.id) {
      const settingsToSave: Omit<UserTaxSettings, 'id' | 'userId'> & { id?: string } = {
        id: userTaxSettings?.id,
        applyPaye: form.getValues("applyPAYE"),
        applySdl: form.getValues("applySDL"),
        enableIrp5Export: form.getValues("enableIrp5Export"),
        irp5ContentFontSize: form.getValues("irp5ContentFontSize"),
        proRateUifCapByFrequency: checked,
      };
      await saveUserTaxSettings(settingsToSave);
    } else {
      showError("User not authenticated. Cannot change UIF cap settings.");
    }
  };

  const canManageTaxSettings = user?.role === 'Admin';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tax Table Calculations</CardTitle>
          <CardDescription>
            Select a SARS tax year and apply the official PAYE brackets, rebates, and UIF/SDL rates to payroll calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="taxYear">Select Tax Year</Label>
              <Select
                value={selectedTaxYear}
                onValueChange={(value) => {
                  // Only update the form's field. We'll set the active year after successful Edge Function apply.
                  form.setValue("taxYear", value);
                }}
                disabled={!canManageTaxSettings || isMockDataEnabled}
              >
                <SelectTrigger id="taxYear" className="mt-1 w-[180px]">
                  <SelectValue placeholder="Select a year" />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => {
                    const meta = getSarsTaxTablesForYear(parseInt(year, 10));
                    return (
                      <SelectItem key={year} value={year}>
                        {year}
                        {meta ? ` (${meta.periodLabel})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {form.formState.errors.taxYear && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.taxYear.message}</p>
              )}
            </div>
            {selectedYearMeta && (
              <p className="text-sm text-muted-foreground">
                Source:{" "}
                <a
                  href={selectedYearMeta.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  SARS employer tax guide
                </a>
              </p>
            )}
            {tableStatusForSelectedYear && (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  tableStatusForSelectedYear.isReady
                    ? "border-green-300 bg-green-50 text-green-900"
                    : tableStatusForSelectedYear.status === "loading"
                      ? "border-muted bg-muted/40 text-muted-foreground"
                      : tableStatusForSelectedYear.status === "stale"
                        ? "border-amber-300 bg-amber-50 text-amber-900"
                        : "border-red-300 bg-red-50 text-red-900"
                }`}
              >
                <p className="font-medium">{getTaxTableStatusLabel(tableStatusForSelectedYear)}</p>
                {selectedYearNum !== activeTaxYearForCalculations && (
                  <p className="mt-1 text-xs opacity-90">
                    Active payroll calculations use TY{activeTaxYearForCalculations}. Apply tables
                    for {selectedYearNum} to activate that year.
                  </p>
                )}
                {tableStatusForSelectedYear.issues.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                    {tableStatusForSelectedYear.issues.map((issue) => (
                      <li key={issue.code}>{issue.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <Button onClick={handleFetchTaxTables} disabled={!selectedTaxYear || !canManageTaxSettings || isMockDataEnabled}>
              Apply Tax Tables
            </Button>
          </div>
          <div className="mt-8 p-4 border rounded-lg bg-muted/40 text-sm text-muted-foreground">
            <h3 className="font-semibold text-foreground mb-2">How this works</h3>
            <p>
              SARS does not provide a public API for tax tables. This app stores official rates from the Budget and
              SARS employer guides, then writes them to your database when you apply a tax year. After Budget day each
              year, new brackets are added here (2026 and 2027 are available now).
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
            <div className="flex items-start space-x-2">
              <Checkbox
                id="applySDL"
                checked={form.watch("applySDL")}
                onCheckedChange={(checked) => form.setValue("applySDL", checked as boolean)}
                disabled={!canManageTaxSettings || isMockDataEnabled}
                className="mt-1"
              />
              <div className="grid gap-0.5">
                <Label htmlFor="applySDL">
                  Employer is SDL-liable (Skills Development Levy)
                </Label>
                <p className="text-xs text-muted-foreground">
                  SDL is a 1% employer levy paid to SARS — it is never deducted from
                  employees. Leave off if exempt (total annual payroll ≤ R500,000).
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Checkbox
                id="applyMedicalAidTaxCredit"
                checked={form.watch("applyMedicalAidTaxCredit")}
                onCheckedChange={(checked) => form.setValue("applyMedicalAidTaxCredit", checked as boolean)}
                disabled={!canManageTaxSettings || isMockDataEnabled}
                className="mt-1"
              />
              <div className="grid gap-0.5">
                <Label htmlFor="applyMedicalAidTaxCredit">
                  Apply medical scheme fees tax credit (Section 6A)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Reduces monthly PAYE for employees flagged as medical-scheme members
                  (main member + dependants). Configure membership per employee.
                </p>
              </div>
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
              Enabling this option makes the IRP5 export available from Payslips. Certificates use
              SARS source codes (3601, 4003, 4102, 4116, 4141, etc.) aggregated from recorded
              payslips for the selected tax year (1 March – 28 February). SDL is excluded from the
              employee certificate (employer EMP201). Bulk e@syFile submission is a separate step
              (see Reports).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>UIF Settings</CardTitle>
          <CardDescription>
            Control whether the UIF monthly cap is pro-rated by pay frequency (weekly/bi-weekly).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="proRateUifCapByFrequency">Pro-rate UIF Cap by Pay Frequency</Label>
            <Switch
              id="proRateUifCapByFrequency"
              checked={form.watch("proRateUifCapByFrequency")}
              onCheckedChange={handleProRateUifToggleChange}
              disabled={!canManageTaxSettings || isMockDataEnabled}
            />
          </div>
          <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
            <h3 className="font-semibold text-lg mb-2">UIF Cap Pro‑rating</h3>
            <p className="text-sm">
              Weekly cap ≈ monthly cap ÷ 4.333; bi‑weekly cap ≈ monthly cap ÷ 2.1667. Monthly stays unchanged. This affects both UIF and taxable income used for PAYE.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaxLiabilities;
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { showSuccess } from "@/utils/toast";
import { ReportDesignSettings } from "@/lib/report-design-interfaces";

const DEFAULT_FONT_SIZE = 14;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 20;

// Define the schema for form validation
const reportDesignSchema = z.object({
  defaultReportPaperSize: z.enum(["Letter", "A4", "A5"]).default("A4"),
  includeCompanyLogo: z.boolean().default(true),
  includeCompanyDetails: z.boolean().default(true),
  reportContentFontSize: z.number().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE).default(DEFAULT_FONT_SIZE),
});

type ReportDesignFormValues = z.infer<typeof reportDesignSchema>;

const ReportDesign: React.FC = () => {
  const form = useForm<ReportDesignFormValues>({
    resolver: zodResolver(reportDesignSchema),
    defaultValues: {
      defaultReportPaperSize: (localStorage.getItem('reportDesignPaperSize') as "Letter" | "A4" | "A5") || "A4",
      // Ensure these default to true if not explicitly set to false
      includeCompanyLogo: JSON.parse(localStorage.getItem('reportDesignIncludeLogo') ?? 'true'),
      includeCompanyDetails: JSON.parse(localStorage.getItem('reportDesignIncludeDetails') ?? 'true'),
      reportContentFontSize: parseFloat(localStorage.getItem('reportDesignFontSize') || DEFAULT_FONT_SIZE.toString()),
    },
  });

  // Effect to update form defaults when mock data is toggled or on initial load
  React.useEffect(() => {
    const updateFormDefaults = () => {
      form.reset({
        defaultReportPaperSize: (localStorage.getItem('reportDesignPaperSize') as "Letter" | "A4" | "A5") || "A4",
        includeCompanyLogo: JSON.parse(localStorage.getItem('reportDesignIncludeLogo') ?? 'true'),
        includeCompanyDetails: JSON.parse(localStorage.getItem('reportDesignIncludeDetails') ?? 'true'),
        reportContentFontSize: parseFloat(localStorage.getItem('reportDesignFontSize') || DEFAULT_FONT_SIZE.toString()),
      });
    };

    window.addEventListener('mockDataUpdated', updateFormDefaults);
    updateFormDefaults(); // Call on mount to ensure initial state reflects current localStorage
    return () => {
      window.removeEventListener('mockDataUpdated', updateFormDefaults);
    };
  }, [form]);

  const onSubmit = (data: ReportDesignFormValues) => {
    console.log("Report Design settings submitted:", data);
    localStorage.setItem('reportDesignPaperSize', data.defaultReportPaperSize);
    localStorage.setItem('reportDesignIncludeLogo', data.includeCompanyLogo.toString());
    localStorage.setItem('reportDesignIncludeDetails', data.includeCompanyDetails.toString());
    localStorage.setItem('reportDesignFontSize', data.reportContentFontSize.toString());

    // Dispatch a custom event to notify other components (like ReportPreviewDialog)
    window.dispatchEvent(new Event('reportDesignUpdated'));

    showSuccess("Report design settings saved successfully!");
  };

  const reportContentFontSize = form.watch("reportContentFontSize");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Report Design</CardTitle>
        <CardDescription>
          Customize the layout and content of your generated reports.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Layout Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Layout Options</h3>
            <div>
              <Label htmlFor="defaultReportPaperSize">Default Paper Size</Label>
              <Select
                onValueChange={(value) => form.setValue("defaultReportPaperSize", value as "Letter" | "A4" | "A5")}
                value={form.watch("defaultReportPaperSize")}
              >
                <SelectTrigger id="defaultReportPaperSize" className="mt-1 w-[180px]">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Letter">US Letter (8.5 x 11 in)</SelectItem>
                  <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                  <SelectItem value="A5">A5 (148 x 210 mm)</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.defaultReportPaperSize && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.defaultReportPaperSize.message}</p>
              )}
            </div>
          </div>

          {/* Header Content */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Header Content</h3>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeCompanyLogo">Include Company Logo</Label>
              <Switch
                id="includeCompanyLogo"
                checked={form.watch("includeCompanyLogo")}
                onCheckedChange={(checked) => form.setValue("includeCompanyLogo", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeCompanyDetails">Include Company Details</Label>
              <Switch
                id="includeCompanyDetails"
                checked={form.watch("includeCompanyDetails")}
                onCheckedChange={(checked) => form.setValue("includeCompanyDetails", checked)}
              />
            </div>
          </div>

          {/* Text Appearance */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Text Appearance</h3>
            <div>
              <Label htmlFor="reportContentFontSize">Report Content Text Size ({reportContentFontSize}px)</Label>
              <Slider
                id="reportContentFontSize"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                step={1}
                value={[reportContentFontSize]}
                onValueChange={(value) => form.setValue("reportContentFontSize", value[0])}
                className="mt-2"
              />
            </div>
          </div>

          <Button type="submit">Save Report Design</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportDesign;
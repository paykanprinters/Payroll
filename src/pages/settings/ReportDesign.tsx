"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import useReportDesignSettings from "@/hooks/use-report-design-settings";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import ReportDesignPreview from "@/components/settings/report-design/ReportDesignPreview";
import ReportLayoutOptions from "@/components/settings/report-design/ReportLayoutOptions";
import ReportHeaderOptions from "@/components/settings/report-design/ReportHeaderOptions";
import ReportTypographyOptions from "@/components/settings/report-design/ReportTypographyOptions";
import ReportPageChromeOptions from "@/components/settings/report-design/ReportPageChromeOptions";
import { Loader2 } from "lucide-react";

const ReportDesign: React.FC = () => {
  const { settings: liveSettings, isLoading, save } = useReportDesignSettings();
  const { companyDetails } = usePayrollProcessor();
  const [settings, setSettings] = useState<ReportDesignSettings>(liveSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setSettings(liveSettings);
  }, [liveSettings]);

  const handleSave = async () => {
    setIsSaving(true);
    await save(settings);
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Design</CardTitle>
          <CardDescription>
            Customize how payroll reports look for preview, PDF download, and print. The page on the
            right updates instantly — save when you want Reports library exports to use these settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading saved settings…
              </div>
            )}

            <ReportLayoutOptions
              settings={settings}
              onPaperSizeChange={(value) =>
                setSettings((prev) => ({ ...prev, defaultReportPaperSize: value }))
              }
            />

            <Separator />

            <ReportHeaderOptions
              settings={settings}
              onToggle={(key, checked) => setSettings((prev) => ({ ...prev, [key]: checked }))}
            />

            <Separator />

            <ReportTypographyOptions
              settings={settings}
              onFontSizeChange={(size) =>
                setSettings((prev) => ({ ...prev, reportContentFontSize: size }))
              }
            />

            <Separator />

            <ReportPageChromeOptions
              settings={settings}
              onChange={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
            />

            <Button type="button" onClick={() => void handleSave()} disabled={isSaving || isLoading} className="w-full">
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save Report Design"
              )}
            </Button>
          </div>

          <ReportDesignPreview settings={settings} companyDetails={companyDetails} />
        </CardContent>
      </Card>

      <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">What this controls</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Paper size for report preview dialogs, HTML print, and PDF pages</li>
          <li>Whether company logo and company details appear in the report header</li>
          <li>Body font size for tables and narrative content in the Reports library</li>
          <li>Page frame: border, corner radius, border-to-edge inset, and content padding</li>
        </ul>
      </div>
    </div>
  );
};

export default ReportDesign;

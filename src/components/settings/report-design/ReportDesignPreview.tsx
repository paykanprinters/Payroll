"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { MockCompanyDetails } from "@/lib/mock-data-interfaces";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import { buildReportDesignSampleHtml } from "@/lib/report-design-sample";
import ReportPagedPreview from "@/components/reports/ReportPagedPreview";

type Props = {
  settings: ReportDesignSettings;
  companyDetails: MockCompanyDetails | null;
  className?: string;
};

/**
 * Live design preview using the same paginated print HTML as Reports / PDF,
 * so border, radius, inset, and padding match export.
 */
const ReportDesignPreview: React.FC<Props> = ({ settings, companyDetails, className }) => {
  const sampleHtml = useMemo(() => buildReportDesignSampleHtml(), []);

  return (
    <div className={cn("flex min-h-[480px] flex-col", className)}>
      <ReportPagedPreview
        reportTitle="Payroll Summary Report"
        reportContentHtml={sampleHtml}
        companyDetails={companyDetails}
        reportDesignSettings={settings}
        orientation="portrait"
        className="h-[min(70vh,640px)] min-h-[480px]"
      />
    </div>
  );
};

export default ReportDesignPreview;

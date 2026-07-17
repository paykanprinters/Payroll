"use client";

import React, { lazy, Suspense, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  DollarSign,
  Scale,
  CalendarDays,
  Clock,
  Building2,
  Banknote,
  UserPlus,
  Users,
  Wallet,
  ScrollText,
  ArrowRight,
  Search,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  REPORT_CATALOG,
  REPORT_CATEGORY_LABELS,
  type ReportCatalogItem,
  type ReportCategoryId,
  type ReportGenerateContext,
} from "@/lib/report-catalog";
import { getReportPeriodLabel, type ReportAuditLevel, type ReportPeriodType } from "@/lib/reports-admin-summary";
import { wrapReportHtml } from "@/lib/report-html-styles";
import type { ReportDesignSettings } from "@/lib/report-design-interfaces";
import type { LeaveEntry, MockCompanyDetails, MockEmployee, MockPayslip } from "@/lib/mock-data-interfaces";

const ReportPreviewDialog = lazy(() => import("@/components/reports/ReportPreviewDialog"));

const ICON_MAP: Record<string, React.ElementType> = {
  "payroll-summary": DollarSign,
  "employee-payslip-register": FileText,
  "tax-statutory": Scale,
  "irp5-export": Scale,
  "leave-absence": CalendarDays,
  "overtime-bonus": Clock,
  "departmental-cost": Building2,
  "new-hires-terminations": UserPlus,
  "employee-demographics": Users,
  "bank-transfer": Banknote,
  "benefit-deductions": Wallet,
  "audit-trail": ScrollText,
};

interface ReportsCatalogProps {
  employees: MockEmployee[];
  payslips: MockPayslip[];
  allPayslips: MockPayslip[];
  leaveRecords: LeaveEntry[];
  companyDetails: MockCompanyDetails | null;
  reportDesignSettings: ReportDesignSettings;
  selectedReportDate: Date | undefined;
  reportPeriodType: ReportPeriodType;
  auditLevel: ReportAuditLevel;
  periodPayslipCount: number;
  auditLogs?: import("@/integrations/supabase/audit-queries").AuditLogEntry[];
}

const ReportsCatalog: React.FC<ReportsCatalogProps> = ({
  employees,
  payslips,
  allPayslips,
  leaveRecords,
  companyDetails,
  reportDesignSettings,
  selectedReportDate,
  reportPeriodType,
  auditLevel,
  periodPayslipCount,
  auditLogs,
}) => {
  const [category, setCategory] = useState<ReportCategoryId | "all">("all");
  const [search, setSearch] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewContent, setPreviewContent] = useState("");

  const periodLabel = getReportPeriodLabel(selectedReportDate, reportPeriodType);

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    return REPORT_CATALOG.filter((report) => {
      if (category !== "all" && report.category !== category) return false;
      if (!report.periodTypes.includes(reportPeriodType)) return false;
      if (!q) return true;
      const hay = `${report.title} ${report.description} ${REPORT_CATEGORY_LABELS[report.category]}`.toLowerCase();
      return hay.includes(q);
    });
  }, [category, search, reportPeriodType]);

  const generateContext: ReportGenerateContext = {
    employees,
    payslips,
    allPayslips,
    leaveRecords,
    selectedDate: selectedReportDate,
    periodType: reportPeriodType,
    auditLevel,
    companyDetails,
    reportDesignSettings,
    auditLogs,
  };

  const openPreview = (report: ReportCatalogItem) => {
    if (!report.generate) return;
    const raw = report.generate(generateContext);
    const wrapped = wrapReportHtml(raw, {
      periodLabel,
      confidentiality: report.confidentiality,
    });
    setPreviewTitle(report.title);
    setPreviewContent(wrapped);
    setIsPreviewOpen(true);
  };

  return (
    <>
      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report library</CardTitle>
          <CardDescription>
            Choose a report for <strong>{periodLabel}</strong>. Preview, print, or download PDF.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              value={category}
              onValueChange={(v) => setCategory(v as ReportCategoryId | "all")}
              className="w-full lg:max-w-3xl"
            >
              <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
                <TabsTrigger value="all" className="rounded-full text-xs sm:text-sm">
                  All
                </TabsTrigger>
                {(Object.keys(REPORT_CATEGORY_LABELS) as ReportCategoryId[]).map((key) => (
                  <TabsTrigger key={key} value={key} className="rounded-full text-xs sm:text-sm">
                    {REPORT_CATEGORY_LABELS[key]}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports…"
                className="pl-8"
                aria-label="Search reports"
              />
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
              No reports match your filters for this period type.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredReports.map((report) => {
                const Icon = ICON_MAP[report.id] || FileText;
                const needsPayslips = report.requiresPayslips && periodPayslipCount === 0;
                const disabledYearlyOnly =
                  report.id === "irp5-export" && reportPeriodType !== "yearly";

                return (
                  <Card
                    key={report.id}
                    className="flex flex-col rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <CardHeader className="space-y-3 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="outline" className="shrink-0 bg-white text-xs">
                          {REPORT_CATEGORY_LABELS[report.category]}
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-base leading-snug">{report.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">{report.description}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-2 pt-0">
                      {report.confidentiality === "sensitive" && (
                        <p className="text-xs text-amber-700">Confidential — payment data</p>
                      )}
                      {report.confidentiality === "statutory" && (
                        <p className="text-xs text-sky-700">Statutory — verify before filing</p>
                      )}
                      {needsPayslips && (
                        <p className="text-xs text-muted-foreground">No payslips in this period yet.</p>
                      )}

                      {report.externalHref ? (
                        <Button
                          asChild
                          className="w-full rounded-full"
                          variant={disabledYearlyOnly ? "outline" : "default"}
                          disabled={disabledYearlyOnly}
                        >
                          <Link to={report.externalHref}>
                            {report.externalLabel || "Open"}
                            <ExternalLink className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => openPreview(report)}
                          variant="outline"
                          className="w-full rounded-full"
                          disabled={needsPayslips}
                        >
                          Preview & export
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isPreviewOpen && (
        <Suspense fallback={null}>
          <ReportPreviewDialog
            isOpen
            onClose={() => setIsPreviewOpen(false)}
            reportTitle={previewTitle}
            reportContent={previewContent}
            companyDetails={companyDetails}
            reportDesignSettings={reportDesignSettings}
            documentType="report"
            periodLabel={periodLabel}
          />
        </Suspense>
      )}
    </>
  );
};

export default ReportsCatalog;

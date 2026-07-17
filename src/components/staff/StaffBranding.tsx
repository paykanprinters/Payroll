"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { supabase } from "@/integrations/supabase/client";
import { getBranding } from "@/config/branding";

type BrandingData = {
  name?: string;
  logoUrl?: string;
};

type EdgeBrandingResponse = {
  name?: string;
  logoUrl?: string;
};

const isEdgeBrandingResponse = (value: unknown): value is EdgeBrandingResponse =>
  typeof value === "object" && value !== null;

const StaffBranding: React.FC = () => {
  const { user } = useAuth();
  const { payslips, companyDetails, employees } = usePayrollProcessor();
  const { settings } = usePayslipDesignSettings();

  // Find current staff's employee
  const myEmployee = employees.find((emp) => emp.userId === user?.id);
  const myEmployeeId = myEmployee?.id;

  // Prefer branding from the most recent payslip snapshot
  let snapshotBranding: BrandingData | null = null;
  if (myEmployeeId) {
    const myPayslips: MockPayslip[] = payslips.filter((p) => p.employeeId === myEmployeeId);
    const mostRecent = [...myPayslips].sort((a, b) => b.payPeriod.localeCompare(a.payPeriod))[0];
    if (mostRecent) {
      snapshotBranding = {
        name: mostRecent.companyName,
        logoUrl: mostRecent.companyLogoUrl || undefined,
      };
    }
  }

  // Secondary fallback: user-scoped design settings; final fallback to minimal feed via edge function
  const designBranding: BrandingData = {
    name:
      snapshotBranding?.name ||
      companyDetails?.companyTradingName ||
      companyDetails?.companyLegalName ||
      undefined,
    logoUrl:
      settings.payslipLogoUrl ||
      snapshotBranding?.logoUrl ||
      companyDetails?.logoUrl ||
      undefined,
  };

  const [edgeBranding, setEdgeBranding] = React.useState<BrandingData | null>(null);
  const [triedEdge, setTriedEdge] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const fetchBranding = async () => {
      if (triedEdge) return;
      setTriedEdge(true);
      const { data, error } = await supabase.functions.invoke("get-branding");
      if (!cancelled && !error && isEdgeBrandingResponse(data)) {
        setEdgeBranding({
          name: typeof data.name === "string" ? data.name : undefined,
          logoUrl: typeof data.logoUrl === "string" ? data.logoUrl : undefined,
        });
      }
    };
    if (!designBranding.name) {
      fetchBranding();
    }
    return () => {
      cancelled = true;
    };
  }, [designBranding.name, triedEdge]);

  const brand = getBranding();
  const finalName = brand.name || snapshotBranding?.name || designBranding.name || edgeBranding?.name || "Kan Printers & Promo";
  const finalLogoUrl = brand.logoUrl || snapshotBranding?.logoUrl || designBranding.logoUrl || edgeBranding?.logoUrl || "/brand/kanprinters_horizontal_color.png";

  const logoWidth = (settings.payslipLogoWidth as number) || (companyDetails?.logoWidth as number) || 100;
  const logoHeight = (settings.payslipLogoHeight as number) || (companyDetails?.logoHeight as number) || 50;
  const logoFit = settings.payslipLogoFit || companyDetails?.logoFit || "contain";

  return (
    <Card className="relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm">
      <div className="absolute left-0 top-0 h-full w-1 bg-primary" />
      <div className="flex items-center gap-4 pl-2">
        {finalLogoUrl ? (
          <img
            src={finalLogoUrl}
            alt="Company Logo"
            style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
            className="shrink-0 rounded-md bg-slate-50 p-1"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600">
            Logo
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm text-muted-foreground">Staff Portal</div>
          <div className="truncate text-lg font-semibold -tracking-tight">{finalName}</div>
        </div>
      </div>
    </Card>
  );
};

export default StaffBranding;
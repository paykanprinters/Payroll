"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import usePayslipDesignSettings from "@/hooks/use-payslip-design-settings";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import { supabase } from "@/integrations/supabase/client";

type BrandingData = {
  name?: string;
  logoUrl?: string;
};

const StaffBranding: React.FC = () => {
  const { user } = useAuth();
  const { payslips, companyDetails, employees } = usePayrollProcessor();
  const { settings } = usePayslipDesignSettings();

  // Find current staff's employee
  const myEmployee = employees.find((emp: any) => emp.userId === user?.id);
  const myEmployeeId = myEmployee?.id;

  // Prefer branding from the most recent payslip snapshot
  let snapshotBranding: BrandingData | null = null;
  if (myEmployeeId) {
    const myPayslips: MockPayslip[] = payslips.filter(p => p.employeeId === myEmployeeId);
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
    name: snapshotBranding?.name || companyDetails?.companyTradingName || companyDetails?.companyLegalName || undefined,
    logoUrl: settings.payslipLogoUrl || snapshotBranding?.logoUrl || companyDetails?.logoUrl || undefined,
  };

  const [edgeBranding, setEdgeBranding] = React.useState<BrandingData | null>(null);
  const [triedEdge, setTriedEdge] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const fetchBranding = async () => {
      if (triedEdge) return;
      setTriedEdge(true);
      const { data, error } = await supabase.functions.invoke('get-branding');
      if (!cancelled && data && !error) {
        setEdgeBranding({
          name: (data as any)?.name,
          logoUrl: (data as any)?.logoUrl,
        });
      }
    };
    if (!designBranding.name) {
      fetchBranding();
    }
    return () => { cancelled = true; };
  }, [designBranding.name, triedEdge]);

  const finalName = snapshotBranding?.name || designBranding.name || edgeBranding?.name || "Your Company";
  const finalLogoUrl = snapshotBranding?.logoUrl || designBranding.logoUrl || edgeBranding?.logoUrl;

  const logoWidth = (settings.payslipLogoWidth as number) || (companyDetails?.logoWidth as number) || 100;
  const logoHeight = (settings.payslipLogoHeight as number) || (companyDetails?.logoHeight as number) || 50;
  const logoFit = settings.payslipLogoFit || (companyDetails?.logoFit as any) || "contain";

  return (
    <Card className="flex items-center gap-4 p-3 border rounded-lg">
      {finalLogoUrl ? (
        <img
          src={finalLogoUrl}
          alt="Company Logo"
          style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
          className="shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-md bg-gray-200 flex items-center justify-center text-gray-500 font-semibold">
          Logo
        </div>
      )}
      <div className="flex-1">
        <div className="text-sm text-muted-foreground">Staff Portal</div>
        <div className="text-lg font-semibold">{finalName}</div>
      </div>
    </Card>
  );
};

export default StaffBranding;
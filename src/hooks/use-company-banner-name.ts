import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";

export function useCompanyBannerName(): string {
  const { companyDetails } = usePayrollProcessor();
  return companyDetails?.companyLegalName || companyDetails?.companyTradingName || "Your Company";
}

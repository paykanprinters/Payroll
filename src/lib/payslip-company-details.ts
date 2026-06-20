import { MockCompanyDetails, MockPayslip } from "@/lib/mock-data-interfaces";

/** Merge payslip snapshot fields with live company profile for display/PDF. */
export function resolveCompanyDetailsForPayslipDisplay(
  payslip: MockPayslip,
  companyDetails: MockCompanyDetails | null
): MockCompanyDetails | null {
  const snapshotName = payslip.companyName?.trim();
  const snapshotAddress = payslip.companyAddress?.trim();
  const snapshotLogo = payslip.companyLogoUrl?.trim();

  if (companyDetails) {
    return {
      ...companyDetails,
      companyTradingName: snapshotName || companyDetails.companyTradingName,
      companyLegalName: companyDetails.companyLegalName,
      physicalAddress: snapshotAddress || companyDetails.physicalAddress,
      logoUrl: snapshotLogo || companyDetails.logoUrl,
    };
  }

  if (!snapshotName && !snapshotAddress && !snapshotLogo) {
    return null;
  }

  return {
    companyTradingName: snapshotName,
    physicalAddress: snapshotAddress,
    logoUrl: snapshotLogo,
  } as MockCompanyDetails;
}

import { MockCompanyDetails } from "../mock-data-interfaces";

export const generateMockCompanyDetails = (): MockCompanyDetails => ({
  companyLegalName: "Acme Corp (Pty) Ltd",
  companyTradingName: "Acme Payroll Solutions",
  companyRegistrationNumber: "2023/123456/07",
  companyTaxNumber: "9876543210",
  vatRegistrationNumber: "4000123456",
  industry: "Software & Payroll Services",
  payeReferenceNumber: "7000123456",
  uifReferenceNumber: "0123456/7",
  sdlReferenceNumber: "L123456789",
  coidaRegistrationNumber: "9876543210",
  physicalAddress: "123 Tech Park, Innovation Hub, Johannesburg, 2000",
  postalAddress: "PO Box 123, Business Centre, 2001",
  mainContactNumber: "+27 11 123 4567",
  alternativeContactNumber: "+27 87 654 3210",
  companyEmail: "info@acmecorp.co.za",
  companyWebsite: "https://www.acmecorp.co.za",
  bankName: "FNB",
  accountholdername: "Acme Corp (Pty) Ltd", // Corrected to match Supabase schema
  accountNumber: "62001234567",
  branchCode: "250655",
  accountType: "Business",
  logoUrl: "https://via.placeholder.com/150/0000FF/FFFFFF?text=ACME", // Placeholder logo
  logoWidth: 100, // Default width
  logoHeight: 50, // Default height
  logoFit: 'contain', // Default object-fit
});
"use client";

import React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { useCompanyDetails } from "@/hooks/use-company-details";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Import useAuth
import { usePayrollProcessor } from "@/hooks/use-payroll-processor"; // Import usePayrollProcessor to get isMockDataEnabled

// Import new modular components
import LegalTradeInfoForm from "@/components/settings/company-details/LegalTradeInfoForm";
import StatutoryInfoForm from "@/components/settings/company-details/StatutoryInfoForm";
import ContactDetailsForm from "@/components/settings/company-details/ContactDetailsForm";
import BankingInfoForm from "@/components/settings/company-details/BankingInfoForm";
import CompanyLogoUpload from "@/components/settings/company-details/CompanyLogoUpload";

// Define the schema for form validation
const companyDetailsSchema = z.object({
  companyLegalName: z.string().optional(),
  companyTradingName: z.string().optional(),
  companyRegistrationNumber: z.string().optional(),
  companyTaxNumber: z.string().optional(),
  vatRegistrationNumber: z.string().optional(),
  industry: z.string().optional(),
  payeReferenceNumber: z.string().optional(),
  uifReferenceNumber: z.string().optional(),
  sdlReferenceNumber: z.string().optional(),
  coidaRegistrationNumber: z.string().optional(),
  physicalAddress: z.string().optional(),
  postalAddress: z.string().optional(),
  mainContactNumber: z.string().optional(),
  alternativeContactNumber: z.string().optional(),
  companyEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  companyWebsite: z.string().url("Invalid URL").optional().or(z.literal('')),
  bankName: z.string().optional(),
  accountholdername: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  accountType: z.enum(["Cheque", "Savings", "Business"]).optional(),
  logoUrl: z.string().optional(),
  logoWidth: z.number().min(20).max(200).default(100),
  logoHeight: z.number().min(20).max(100).default(50),
  logoFit: z.enum(["contain", "cover", "fill", "none", "scale-down"]).default("contain"),
});

type CompanyDetailsFormValues = z.infer<typeof companyDetailsSchema>;

const CompanyDetails: React.FC = () => {
  console.log("CompanyDetails.tsx: Component is rendering."); // Add this line
  const { companyDetails, isLoading, upsertCompanyDetails } = useCompanyDetails();
  const { user, isLoadingAuth } = useAuth(); // Get current user from AuthContext
  const { isMockDataEnabled } = usePayrollProcessor(); // Get mock data status

  const formMethods = useForm<CompanyDetailsFormValues>({
    resolver: zodResolver(companyDetailsSchema),
    defaultValues: {
      companyLegalName: "",
      companyTradingName: "",
      companyRegistrationNumber: "",
      companyTaxNumber: "",
      vatRegistrationNumber: "",
      industry: "",
      payeReferenceNumber: "",
      uifReferenceNumber: "",
      sdlReferenceNumber: "",
      coidaRegistrationNumber: "",
      physicalAddress: "",
      postalAddress: "",
      mainContactNumber: "",
      alternativeContactNumber: "",
      companyEmail: "",
      companyWebsite: "",
      bankName: "",
      accountholdername: "",
      accountNumber: "",
      branchCode: "",
      accountType: "Cheque",
      logoUrl: "",
      logoWidth: 100,
      logoHeight: 50,
      logoFit: "contain",
    },
  });

  // Watch all form values for debugging
  const watchedFormValues = formMethods.watch();
  React.useEffect(() => {
    console.log("CompanyDetails.tsx: Current form values (watched):", watchedFormValues);
  }, [watchedFormValues]);

  // Populate form with data from Supabase when it loads
  React.useEffect(() => {
    console.log("CompanyDetails.tsx useEffect triggered. companyDetails from hook:", companyDetails, "isLoading from hook:", isLoading);
    if (companyDetails) {
      formMethods.reset({
        companyLegalName: companyDetails.companyLegalName || "",
        companyTradingName: companyDetails.companyTradingName || "",
        companyRegistrationNumber: companyDetails.companyRegistrationNumber || "",
        companyTaxNumber: companyDetails.companyTaxNumber || "",
        vatRegistrationNumber: companyDetails.vatRegistrationNumber || "",
        industry: companyDetails.industry || "",
        payeReferenceNumber: companyDetails.payeReferenceNumber || "",
        uifReferenceNumber: companyDetails.uifReferenceNumber || "",
        sdlReferenceNumber: companyDetails.sdlReferenceNumber || "",
        coidaRegistrationNumber: companyDetails.coidaRegistrationNumber || "",
        physicalAddress: companyDetails.physicalAddress || "",
        postalAddress: companyDetails.postalAddress || "",
        mainContactNumber: companyDetails.mainContactNumber || "",
        alternativeContactNumber: companyDetails.alternativeContactNumber || "",
        companyEmail: companyDetails.companyEmail || "",
        companyWebsite: companyDetails.companyWebsite || "",
        bankName: companyDetails.bankName || "",
        accountholdername: companyDetails.accountholdername || "",
        accountNumber: companyDetails.accountNumber || "",
        branchCode: companyDetails.branchCode || "",
        accountType: companyDetails.accountType || "Cheque",
        logoUrl: companyDetails.logoUrl || "",
        logoWidth: companyDetails.logoWidth || 100,
        logoHeight: companyDetails.logoHeight || 50,
        logoFit: companyDetails.logoFit || "contain",
      });
      console.log("CompanyDetails.tsx: Form reset with fetched data.");
    } else if (!isLoading) {
      // If no company details are found and not loading, reset to empty defaults
      formMethods.reset({
        companyLegalName: "", companyTradingName: "", companyRegistrationNumber: "",
        companyTaxNumber: "", vatRegistrationNumber: "", industry: "",
        payeReferenceNumber: "", uifReferenceNumber: "", sdlReferenceNumber: "",
        coidaRegistrationNumber: "", physicalAddress: "", postalAddress: "",
        mainContactNumber: "", alternativeContactNumber: "", companyEmail: "",
        companyWebsite: "", bankName: "", accountholdername: "", accountNumber: "",
        branchCode: "", accountType: "Cheque", logoUrl: "",
        logoWidth: 100, logoHeight: 50, logoFit: "contain",
      });
      console.log("CompanyDetails.tsx: Form reset with empty defaults for initial setup.");
    }
  }, [companyDetails, isLoading, formMethods]);

  const onSubmit = async (data: CompanyDetailsFormValues) => {
    await upsertCompanyDetails(data);
  };

  const canEdit = user?.role === 'Admin';

  if (isLoading || isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading company details...</span>
      </div>
    );
  }

  // TEMPORARY DEBUGGING: Render simple text
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightgray', border: '1px solid black' }}>
      <h2>Company Details Debug View</h2>
      <p>Is Loading (useCompanyDetails): {isLoading ? "True" : "False"}</p>
      <p>Is Loading Auth: {isLoadingAuth ? "True" : "False"}</p>
      <p>Company Details: {companyDetails ? JSON.stringify(companyDetails) : "NULL"}</p>
      <p>User Role: {user?.role || "N/A"}</p>
      <p>Mock Data Enabled: {isMockDataEnabled ? "True" : "False"}</p>
      <p>If you see this, the component is rendering!</p>
    </div>
  );
};

export default CompanyDetails;
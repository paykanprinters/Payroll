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
import { usePayrollProcessor } from "@/context/PayrollDataContext"; // Import usePayrollProcessor to get isMockDataEnabled
import { useSearchParams } from "react-router-dom";

// Import new modular components
import LegalTradeInfoForm from "@/components/settings/company-details/LegalTradeInfoForm";
import StatutoryInfoForm from "@/components/settings/company-details/StatutoryInfoForm";
import ContactDetailsForm from "@/components/settings/company-details/ContactDetailsForm";
import BankingInfoForm from "@/components/settings/company-details/BankingInfoForm";
import CompanyLogoUpload from "@/components/settings/company-details/CompanyLogoUpload";
import { seedKanBrandLogo } from "@/lib/seed-kan-logo";

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
  logoWidth: z.number().min(40).max(320).default(180),
  logoHeight: z.number().min(24).max(120).default(60),
  logoFit: z.enum(["contain", "cover", "fill", "none", "scale-down"]).default("contain"),
});

type CompanyDetailsFormValues = z.infer<typeof companyDetailsSchema>;

const CompanyDetails: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { companyDetails, isLoading, upsertCompanyDetails } = useCompanyDetails({ isMockDataEnabled: false, isAuthenticated: true, isLoadingAuth: false }); // Pass explicit values for now
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
      logoWidth: 180,
      logoHeight: 60,
      logoFit: "contain",
    },
  });

  // Populate form with data from Supabase when it loads
  React.useEffect(() => {
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
        logoWidth: companyDetails.logoWidth || 180,
        logoHeight: companyDetails.logoHeight || 60,
        logoFit: companyDetails.logoFit || "contain",
      });
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
    }
  }, [companyDetails, isLoading, formMethods]);

  React.useEffect(() => {
    const focus = (searchParams.get("focus") || "").toLowerCase();
    if (!focus) return;
    if (isLoading || isLoadingAuth) return;

    // Allow the page to render before scrolling.
    window.requestAnimationFrame(() => {
      if (focus === "tax") {
        const el = document.getElementById("companyTaxNumber");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        (el as HTMLInputElement | null)?.focus?.();
      }
    });

    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, isLoading, isLoadingAuth]);

  // One-time Kan logo seed for payslips/reports (Admin, live data only)
  React.useEffect(() => {
    if (isLoadingAuth || isLoading || isMockDataEnabled || user?.role !== "Admin") return;

    let cancelled = false;
    (async () => {
      const result = await seedKanBrandLogo();
      if (cancelled || result.skipped || !result.ok || !result.logoUrl) return;

      formMethods.setValue("logoUrl", result.logoUrl);
      formMethods.setValue("logoWidth", 180);
      formMethods.setValue("logoHeight", 60);
      formMethods.setValue("logoFit", "contain");
      showSuccess("Kan Printers logo applied to payslips and reports.");
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoadingAuth, isLoading, isMockDataEnabled, user?.role, formMethods]);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>
          Manage your company's legal, contact, and banking information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...formMethods}>
          <form onSubmit={formMethods.handleSubmit(onSubmit)} className="space-y-8">
            <CompanyLogoUpload canEdit={canEdit} isMockDataEnabled={isMockDataEnabled} />
            <LegalTradeInfoForm canEdit={canEdit} />
            <StatutoryInfoForm canEdit={canEdit} />
            <ContactDetailsForm canEdit={canEdit} />
            <BankingInfoForm canEdit={canEdit} />
            <Button type="submit" className="w-full" disabled={!canEdit}>
              Save Company Details
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

export default CompanyDetails;
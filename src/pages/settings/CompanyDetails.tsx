"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { showSuccess, showError } from "@/utils/toast";
import { useCompanyDetails } from "@/hooks/use-company-details";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext"; // Import useAuth

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
  const { companyDetails, isLoading, upsertCompanyDetails } = useCompanyDetails();
  const { user, isLoadingAuth } = useAuth(); // Get current user from AuthContext

  const form = useForm<CompanyDetailsFormValues>({
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

  // Populate form with data from Supabase when it loads
  React.useEffect(() => {
    if (companyDetails) {
      form.reset({
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
    } else if (!isLoading) {
      // If no company details are found and not loading, reset to empty defaults
      form.reset({
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
  }, [companyDetails, isLoading, form]);

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue("logoUrl", dataUrl);
        // Reset to default dimensions and fit when new logo is uploaded
        form.setValue("logoWidth", 100);
        form.setValue("logoHeight", 50);
        form.setValue("logoFit", "contain");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    form.setValue("logoUrl", "");
    form.setValue("logoWidth", 100); // Reset to default size
    form.setValue("logoHeight", 50); // Reset to default size
    form.setValue("logoFit", "contain"); // Reset to default fit
    showSuccess("Company logo removed successfully!");
  };

  const handleLogoWidthChange = (value: number[]) => {
    form.setValue("logoWidth", value[0]);
  };

  const handleLogoHeightChange = (value: number[]) => {
    form.setValue("logoHeight", value[0]);
  };

  const handleLogoFitChange = (value: "contain" | "cover" | "fill" | "none" | "scale-down") => {
    form.setValue("logoFit", value);
  };

  const onSubmit = async (data: CompanyDetailsFormValues) => {
    await upsertCompanyDetails(data);
  };

  const logoUrl = form.watch("logoUrl");
  const logoWidth = form.watch("logoWidth");
  const logoHeight = form.watch("logoHeight");
  const logoFit = form.watch("logoFit");

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
          Manage your company's legal, contact, statutory, and banking information.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!canEdit && (
          <div className="mb-6 p-4 border rounded-lg bg-red-50 text-red-800">
            <h3 className="font-semibold text-lg mb-2">Access Denied</h3>
            <p className="text-sm">
              You do not have the necessary permissions to edit company details. Only users with the 'Admin' role can make changes here.
            </p>
          </div>
        )}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Legal & Trade Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Legal & Trade Information</h3>
            <div>
              <Label htmlFor="companyLegalName">Company Legal Name</Label>
              <Input
                id="companyLegalName"
                {...form.register("companyLegalName")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="companyTradingName">Company Trading Name</Label>
              <Input
                id="companyTradingName"
                {...form.register("companyTradingName")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="companyRegistrationNumber">Company Registration Number</Label>
              <Input
                id="companyRegistrationNumber"
                {...form.register("companyRegistrationNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="companyTaxNumber">Company Tax Number</Label>
              <Input
                id="companyTaxNumber"
                {...form.register("companyTaxNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="vatRegistrationNumber">VAT Registration Number</Label>
              <Input
                id="vatRegistrationNumber"
                {...form.register("vatRegistrationNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry / Business Type</Label>
              <Input
                id="industry"
                {...form.register("industry")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Statutory Registration Numbers (South Africa) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Statutory Registration Numbers (South Africa)</h3>
            <p className="text-sm text-muted-foreground">These numbers are essential for SARS and other regulatory bodies.</p>
            <div>
              <Label htmlFor="payeReferenceNumber">PAYE Reference Number</Label>
              <Input
                id="payeReferenceNumber"
                {...form.register("payeReferenceNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="uifReferenceNumber">UIF Reference Number</Label>
              <Input
                id="uifReferenceNumber"
                {...form.register("uifReferenceNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="sdlReferenceNumber">SDL Reference Number</Label>
              <Input
                id="sdlReferenceNumber"
                {...form.register("sdlReferenceNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="coidaRegistrationNumber">COIDA Registration Number</Label>
              <Input
                id="coidaRegistrationNumber"
                {...form.register("coidaRegistrationNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Company Contact Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Contact Details</h3>
            <div>
              <Label htmlFor="physicalAddress">Physical Address</Label>
              <Textarea
                id="physicalAddress"
                {...form.register("physicalAddress")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="postalAddress">Postal Address (if different)</Label>
              <Textarea
                id="postalAddress"
                {...form.register("postalAddress")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="mainContactNumber">Main Contact Number</Label>
              <Input
                id="mainContactNumber"
                {...form.register("mainContactNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="alternativeContactNumber">Alternative Contact Number</Label>
              <Input
                id="alternativeContactNumber"
                {...form.register("alternativeContactNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="companyEmail">Company Email Address</Label>
              <Input
                id="companyEmail"
                type="email"
                {...form.register("companyEmail")}
                className="mt-1"
                disabled={!canEdit}
              />
              {form.formState.errors.companyEmail && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.companyEmail.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="companyWebsite">Company Web Address</Label>
              <Input
                id="companyWebsite"
                type="url"
                {...form.register("companyWebsite")}
                className="mt-1"
                disabled={!canEdit}
              />
              {form.formState.errors.companyWebsite && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.companyWebsite.message}</p>
              )}
            </div>
          </div>

          {/* Banking Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Banking Information</h3>
            <p className="text-sm text-muted-foreground">Bank details for payroll disbursements.</p>
            <div>
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                {...form.register("bankName")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="accountholdername">Account Holder Name</Label>
              <Input
                id="accountholdername"
                {...form.register("accountholdername")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                {...form.register("accountNumber")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="branchCode">Branch Code</Label>
              <Input
                id="branchCode"
                {...form.register("branchCode")}
                className="mt-1"
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Select onValueChange={(value) => form.setValue("accountType", value as "Cheque" | "Savings" | "Business")} value={form.watch("accountType")} disabled={!canEdit}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Company Logo */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Company Logo</h3>
            <div className="flex items-center gap-2">
              <Label htmlFor="companyLogo">Upload Logo</Label>
              <Input
                id="companyLogo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="mt-1 flex-1"
                disabled={!canEdit}
              />
              {logoUrl && (
                <Button type="button" variant="outline" onClick={handleRemoveLogo} className="mt-1" disabled={!canEdit}>
                  Remove Logo
                </Button>
              )}
            </div>
            {logoUrl && (
              <div className="mt-4 space-y-4">
                <Label>Logo Preview</Label>
                <div className="flex items-center space-x-4 mt-2 border p-2 rounded-md">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    style={{ width: logoWidth, height: logoHeight, objectFit: logoFit }}
                    className="rounded-md border p-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div>
                      <Label htmlFor="logoWidth">Logo Width ({logoWidth}px)</Label>
                      <Slider
                        id="logoWidth"
                        min={20}
                        max={200}
                        step={1}
                        value={[logoWidth]}
                        onValueChange={handleLogoWidthChange}
                        className="mt-2"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="logoHeight">Logo Height ({logoHeight}px)</Label>
                      <Slider
                        id="logoHeight"
                        min={20}
                        max={100}
                        step={1}
                        value={[logoHeight]}
                        onValueChange={handleLogoHeightChange}
                        className="mt-2"
                        disabled={!canEdit}
                      />
                    </div>
                    <div>
                      <Label htmlFor="logoFit">Object Fit</Label>
                      <Select onValueChange={handleLogoFitChange} value={logoFit} disabled={!canEdit}>
                        <SelectTrigger id="logoFit" className="mt-1">
                          <SelectValue placeholder="Select fit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contain">Contain</SelectItem>
                          <SelectItem value="cover">Cover</SelectItem>
                          <SelectItem value="fill">Fill</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="scale-down">Scale Down</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={!canEdit}>Save Company Details</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompanyDetails;
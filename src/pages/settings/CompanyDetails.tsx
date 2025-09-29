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
  accountHolderName: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  accountType: z.enum(["Cheque", "Savings", "Business"]).optional(),
  logoUrl: z.string().optional(),
  logoSize: z.number().min(20).max(100).default(40),
});

type CompanyDetailsFormValues = z.infer<typeof companyDetailsSchema>;

const CompanyDetails: React.FC = () => {
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
      accountHolderName: "",
      accountNumber: "",
      branchCode: "",
      accountType: "Cheque", // Default value, but now optional
      logoUrl: localStorage.getItem('companyLogoUrl') || '',
      logoSize: parseFloat(localStorage.getItem('companyLogoSize') || '40'),
    },
  });

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        form.setValue("logoUrl", dataUrl);
        localStorage.setItem('companyLogoUrl', dataUrl);
        window.dispatchEvent(new Event('companyDetailsUpdated')); // Notify sidebar
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    form.setValue("logoUrl", "");
    form.setValue("logoSize", 40); // Reset to default size
    localStorage.removeItem('companyLogoUrl');
    localStorage.removeItem('companyLogoSize');
    window.dispatchEvent(new Event('companyDetailsUpdated')); // Notify sidebar
    showSuccess("Company logo removed successfully!");
  };

  const handleLogoSizeChange = (value: number[]) => {
    form.setValue("logoSize", value[0]);
    localStorage.setItem('companyLogoSize', value[0].toString());
    window.dispatchEvent(new Event('companyDetailsUpdated')); // Notify sidebar
  };

  const onSubmit = (data: CompanyDetailsFormValues) => {
    console.log("Company Details submitted:", data);
    // Here you would typically send this data to your backend
    localStorage.setItem('companyTradingName', data.companyTradingName || '');
    localStorage.setItem('companyLogoUrl', data.logoUrl || '');
    localStorage.setItem('companyLogoSize', data.logoSize.toString());

    // Dispatch a custom event to notify other components (like Sidebar)
    window.dispatchEvent(new Event('companyDetailsUpdated'));

    showSuccess("Company details saved successfully!");
  };

  const logoUrl = form.watch("logoUrl");
  const logoSize = form.watch("logoSize");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Details</CardTitle>
        <CardDescription>
          Manage your company's legal, contact, statutory, and banking information.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="companyTradingName">Company Trading Name</Label>
              <Input
                id="companyTradingName"
                {...form.register("companyTradingName")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="companyRegistrationNumber">Company Registration Number</Label>
              <Input
                id="companyRegistrationNumber"
                {...form.register("companyRegistrationNumber")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="companyTaxNumber">Company Tax Number</Label>
              <Input
                id="companyTaxNumber"
                {...form.register("companyTaxNumber")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="vatRegistrationNumber">VAT Registration Number</Label>
              <Input
                id="vatRegistrationNumber"
                {...form.register("vatRegistrationNumber")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="industry">Industry / Business Type</Label>
              <Input
                id="industry"
                {...form.register("industry")}
                className="mt-1"
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
              />
            </div>
            <div>
              <Label htmlFor="uifReferenceNumber">UIF Reference Number</Label>
              <Input
                id="uifReferenceNumber"
                {...form.register("uifReferenceNumber")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="sdlReferenceNumber">SDL Reference Number</Label>
              <Input
                id="sdlReferenceNumber"
                {...form.register("sdlReferenceNumber")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="coidaRegistrationNumber">COIDA Registration Number</Label>
              <Input
                id="coidaRegistrationNumber"
                {...form.register("coidaRegistrationNumber")}
                className="mt-1"
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
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="postalAddress">Postal Address (if different)</Label>
              <Textarea
                id="postalAddress"
                {...form.register("postalAddress")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="mainContactNumber">Main Contact Number</Label>
              <Input
                id="mainContactNumber"
                {...form.register("mainContactNumber")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="alternativeContactNumber">Alternative Contact Number</Label>
              <Input
                id="alternativeContactNumber"
                {...form.register("alternativeContactNumber")}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="companyEmail">Company Email Address</Label>
              <Input
                id="companyEmail"
                type="email"
                {...form.register("companyEmail")}
                className="mt-1"
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
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="accountHolderName">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                {...form.register("accountHolderName")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                {...form.register("accountNumber")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="branchCode">Branch Code</Label>
              <Input
                id="branchCode"
                {...form.register("branchCode")}
                className="mt-1"
              />
              {/* Removed error message for optional field */}
            </div>
            <div>
              <Label htmlFor="accountType">Account Type</Label>
              <Select onValueChange={(value) => form.setValue("accountType", value as "Cheque" | "Savings" | "Business")} defaultValue={form.getValues("accountType")}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select account type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Savings">Savings</SelectItem>
                  <SelectItem value="Business">Business</SelectItem>
                </SelectContent>
              </Select>
              {/* Removed error message for optional field */}
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
              />
              {logoUrl && (
                <Button type="button" variant="outline" onClick={handleRemoveLogo} className="mt-1">
                  Remove Logo
                </Button>
              )}
            </div>
            {logoUrl && (
              <div className="mt-4">
                <Label>Logo Preview</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <img
                    src={logoUrl}
                    alt="Company Logo"
                    style={{ width: logoSize, height: logoSize, objectFit: 'contain' }}
                    className="rounded-md border p-1"
                  />
                  <div className="flex-1">
                    <Label htmlFor="logoSize">Logo Size ({logoSize}px)</Label>
                    <Slider
                      id="logoSize"
                      min={20}
                      max={100}
                      step={1}
                      value={[logoSize]}
                      onValueChange={handleLogoSizeChange}
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button type="submit">Save Company Details</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompanyDetails;
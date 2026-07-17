"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess, showError } from "@/utils/toast";
import { seedKanBrandLogo } from "@/lib/seed-kan-logo";
import { supabase } from "@/integrations/supabase/client"; // Import supabase client
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context"; // Import usePayrollProcessor

interface CompanyLogoUploadProps {
  canEdit: boolean;
  isMockDataEnabled: boolean; // New prop
}

const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ canEdit, isMockDataEnabled }) => {
  const { setValue, watch } = useFormContext();
  const logoUrl = watch("logoUrl");
  const logoWidth = watch("logoWidth");
  const logoHeight = watch("logoHeight");
  const logoFit = watch("logoFit");

  const SUPABASE_STORAGE_BUCKET = "company-logos";
  const SUPABASE_STORAGE_PATH = "company_logo.png";
  const SUPABASE_PUBLIC_URL_PREFIX = `${supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(SUPABASE_STORAGE_PATH).data.publicUrl.split('?')[0]}`;

  const uploadFileToSupabaseStorage = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      // Delete existing file first if it's a Supabase URL
      if (logoUrl && logoUrl.startsWith(SUPABASE_PUBLIC_URL_PREFIX)) {
        const { error: deleteError } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .remove([SUPABASE_STORAGE_PATH]);

        if (deleteError && deleteError.message !== "The resource was not found") { // Ignore 'not found' error
          console.error("Error deleting old logo from Supabase Storage:", deleteError);
          showError("Failed to delete old logo from storage.");
          return null;
        }
      }

      const { data, error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(SUPABASE_STORAGE_PATH, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if exists
          contentType: file.type,
        });

      if (error) {
        console.error("Error uploading logo to Supabase Storage:", error);
        showError(`Failed to upload logo: ${error.message}`);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(SUPABASE_STORAGE_PATH);

      return publicUrlData.publicUrl;

    } catch (err: unknown) {
      console.error("Unexpected error during Supabase logo upload:", err);
      showError(`An unexpected error occurred during logo upload: ${err instanceof Error ? err.message : "Unknown error"}`);
      return null;
    }
  };

  const deleteFileFromSupabaseStorage = async () => {
    if (!logoUrl || !logoUrl.startsWith(SUPABASE_PUBLIC_URL_PREFIX)) return; // Only delete Supabase URLs

    try {
      const { error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .remove([SUPABASE_STORAGE_PATH]);

      if (error && error.message !== "The resource was not found") {
        console.error("Error deleting logo from Supabase Storage:", error);
        showError("Failed to delete logo from storage.");
      } else {
        showSuccess("Logo removed from storage.");
      }
    } catch (err: unknown) {
      console.error("Unexpected error during Supabase logo deletion:", err);
      showError(`An unexpected error occurred during logo deletion: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isMockDataEnabled) {
      // Handle mock data locally
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setValue("logoUrl", dataUrl);
        setValue("logoWidth", 180);
        setValue("logoHeight", 60);
        setValue("logoFit", "contain");
        showSuccess("Mock company logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    } else {
      // Handle live data with Supabase Storage
      const publicUrl = await uploadFileToSupabaseStorage(file);
      if (publicUrl) {
        setValue("logoUrl", publicUrl);
        setValue("logoWidth", 180);
        setValue("logoHeight", 60);
        setValue("logoFit", "contain");
        showSuccess("Company logo uploaded successfully to Supabase Storage!");
      } else {
        showError("Failed to upload company logo.");
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (isMockDataEnabled) {
      // Handle mock data locally
      setValue("logoUrl", "");
      setValue("logoWidth", 180);
      setValue("logoHeight", 60);
      setValue("logoFit", "contain");
      showSuccess("Mock company logo removed successfully!");
    } else {
      // Handle live data with Supabase Storage
      await deleteFileFromSupabaseStorage();
      setValue("logoUrl", "");
      setValue("logoWidth", 180);
      setValue("logoHeight", 60);
      setValue("logoFit", "contain");
    }
  };

  const handleLogoWidthChange = (value: number[]) => {
    setValue("logoWidth", value[0]);
  };

  const handleLogoHeightChange = (value: number[]) => {
    setValue("logoHeight", value[0]);
  };

  const handleLogoFitChange = (value: "contain" | "cover" | "fill" | "none" | "scale-down") => {
    setValue("logoFit", value);
  };

  const handleApplyKanLogo = async () => {
    const result = await seedKanBrandLogo(true);
    if (result.ok && result.logoUrl) {
      setValue("logoUrl", result.logoUrl);
      setValue("logoWidth", 180);
      setValue("logoHeight", 60);
      setValue("logoFit", "contain");
      showSuccess("Kan Printers logo applied to payslips and reports.");
    } else {
      showError("Could not apply Kan Printers logo. Check storage permissions.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Payslip &amp; Report Logo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Optional override for payslips and PDF reports. Navigation and login always use the bundled Kan Printers brand.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="companyLogo">Upload Logo</Label>
            <Input
              id="companyLogo"
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="mt-1 flex-1 min-w-[12rem]"
              disabled={!canEdit}
            />
            {canEdit && (
              <Button type="button" variant="secondary" onClick={handleApplyKanLogo} className="mt-1">
                Use Kan Printers logo
              </Button>
            )}
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
                      min={40}
                      max={320}
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
                      min={24}
                      max={120}
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
      </CardContent>
    </Card>
  );
};

export default CompanyLogoUpload;
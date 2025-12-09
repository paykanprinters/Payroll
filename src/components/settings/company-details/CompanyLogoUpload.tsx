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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

interface CompanyLogoUploadProps {
  canEdit: boolean;
  isMockDataEnabled: boolean;
}

const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ canEdit, isMockDataEnabled }) => {
  const { setValue, watch } = useFormContext();
  const { userId } = useAuth();
  const logoUrl = watch("logoUrl");
  const logoWidth = watch("logoWidth");
  const logoHeight = watch("logoHeight");
  const logoFit = watch("logoFit");

  const SUPABASE_STORAGE_BUCKET = "company-logos";

  const getPublicUrlPrefix = (path: string) =>
    supabase.storage.from(SUPABASE_STORAGE_BUCKET).getPublicUrl(path).data.publicUrl.split("?")[0];

  const getCurrentPathFromUrl = (): string | null => {
    if (!logoUrl) return null;
    try {
      const withoutQuery = logoUrl.split("?")[0];
      const parts = new URL(withoutQuery);
      const idx = parts.pathname.indexOf("/object/public/");
      if (idx === -1) return null;
      return decodeURIComponent(parts.pathname.substring(idx + "/object/public/".length));
    } catch {
      // Likely a data URL or external URL
      return null;
    }
  };

  const uploadFileToSupabaseStorage = async (file: File): Promise<string | null> => {
    if (!file) return null;
    if (!userId) {
      showError("You must be signed in to upload a logo.");
      return null;
    }

    try {
      // Generate a unique path to avoid accidental overwrite: logos/{userId}/{timestamp}_{filename}
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueName = `${Date.now()}_${sanitizedName}`;
      const newPath = `logos/${userId}/${uniqueName}`;

      // Delete the previous file if it was stored in our bucket
      const prevPath = getCurrentPathFromUrl();
      if (prevPath && prevPath.startsWith("company-logos/")) {
        const rel = prevPath.replace(/^company-logos\//, "");
        const { error: deleteError } = await supabase.storage
          .from(SUPABASE_STORAGE_BUCKET)
          .remove([rel]);
        if (deleteError && deleteError.message !== "The resource was not found") {
          console.error("Error deleting old logo from Supabase Storage:", deleteError);
          showError("Failed to delete old logo from storage.");
          return null;
        }
      }

      const { data, error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .upload(newPath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.error("Error uploading logo to Supabase Storage:", error);
        showError(`Failed to upload logo: ${error.message}`);
        return null;
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(newPath);

      return publicUrlData.publicUrl;
    } catch (err: any) {
      console.error("Unexpected error during Supabase logo upload:", err);
      showError(`An unexpected error occurred during logo upload: ${err.message}`);
      return null;
    }
  };

  const deleteFileFromSupabaseStorage = async () => {
    const prevPath = getCurrentPathFromUrl();
    if (!prevPath || !prevPath.startsWith("company-logos/")) return;

    try {
      const rel = prevPath.replace(/^company-logos\//, "");
      const { error } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .remove([rel]);

      if (error && error.message !== "The resource was not found") {
        console.error("Error deleting logo from Supabase Storage:", error);
        showError("Failed to delete logo from storage.");
      } else {
        showSuccess("Logo removed from storage.");
      }
    } catch (err: any) {
      console.error("Unexpected error during Supabase logo deletion:", err);
      showError(`An unexpected error occurred during logo deletion: ${err.message}`);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (isMockDataEnabled) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setValue("logoUrl", dataUrl);
        setValue("logoWidth", 100);
        setValue("logoHeight", 50);
        setValue("logoFit", "contain");
        showSuccess("Mock company logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    } else {
      const publicUrl = await uploadFileToSupabaseStorage(file);
      if (publicUrl) {
        setValue("logoUrl", publicUrl);
        setValue("logoWidth", 100);
        setValue("logoHeight", 50);
        setValue("logoFit", "contain");
        showSuccess("Company logo uploaded successfully to Supabase Storage!");
      } else {
        showError("Failed to upload company logo.");
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (isMockDataEnabled) {
      setValue("logoUrl", "");
      setValue("logoWidth", 100);
      setValue("logoHeight", 50);
      setValue("logoFit", "contain");
      showSuccess("Mock company logo removed successfully!");
    } else {
      await deleteFileFromSupabaseStorage();
      setValue("logoUrl", "");
      setValue("logoWidth", 100);
      setValue("logoHeight", 50);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Company Logo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
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
      </CardContent>
    </Card>
  );
};

export default CompanyLogoUpload;
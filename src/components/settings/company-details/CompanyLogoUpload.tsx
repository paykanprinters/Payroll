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
  const logoStoragePath = watch("logoStoragePath"); // internal tracking: logos/{uid}/filename.ext

  const SUPABASE_STORAGE_BUCKET = "company-logos";

  const getCurrentPathFromUrl = (): string | null => {
    if (!logoUrl) return null;
    try {
      const withoutQuery = logoUrl.split("?")[0];
      const parts = new URL(withoutQuery);
      const idx = parts.pathname.indexOf("/object/public/");
      if (idx === -1) return null;
      return decodeURIComponent(parts.pathname.substring(idx + "/object/public/".length));
    } catch {
      return null;
    }
  };

  // From public URL -> relative storage path within bucket (e.g., 'logos/{uid}/file.png')
  const getRelativePathFromUrl = (): string | null => {
    const full = getCurrentPathFromUrl();
    if (!full) return null;
    if (!full.startsWith(`${SUPABASE_STORAGE_BUCKET}/`)) return null;
    return full.replace(`${SUPABASE_STORAGE_BUCKET}/`, "");
  };

  const uploadFileToSupabaseStorage = async (file: File): Promise<{ publicUrl: string; path: string } | null> => {
    if (!file) return null;
    if (!userId) {
      showError("You must be signed in to upload a logo.");
      return null;
    }

    // Only allow images
    if (!file.type.startsWith("image/")) {
      showError("Please upload an image file.");
      return null;
    }

    try {
      // Ask edge function for a signed upload URL (admin-only)
      const { data, error } = await supabase.functions.invoke("create-signed-logo-upload", {
        body: { fileName: file.name },
      });

      if (error || !data?.token || !data?.path) {
        console.error("Failed to get signed upload URL:", error);
        showError("Failed to initialize secure upload.");
        return null;
      }

      // Upload using signed URL token
      const { error: uploadErr } = await supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .uploadToSignedUrl(data.path, data.token, file);

      if (uploadErr) {
        console.error("Error uploading logo via signed URL:", uploadErr);
        showError(`Failed to upload logo: ${uploadErr.message}`);
        return null;
      }

      // Compute public URL
      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_STORAGE_BUCKET)
        .getPublicUrl(data.path);

      // Delete the previous file securely via edge function if it belongs to this user namespace
      const prevRel = (logoStoragePath as string | undefined) ?? getRelativePathFromUrl();
      if (prevRel && userId && prevRel.startsWith(`logos/${userId}/`)) {
        await supabase.functions.invoke("delete-logo", { body: { path: prevRel } });
      }

      return { publicUrl: publicUrlData.publicUrl, path: data.path as string };
    } catch (err: any) {
      console.error("Unexpected error during Supabase logo upload:", err);
      showError(`An unexpected error occurred during logo upload: ${err.message}`);
      return null;
    }
  };

  const deleteFileFromSupabaseStorage = async () => {
    const rel = (logoStoragePath as string | undefined) ?? getRelativePathFromUrl();
    if (!rel) return;

    if (!userId || !rel.startsWith(`logos/${userId}/`)) {
      // Do not attempt to delete paths outside of the user's namespace
      showError("Cannot remove this logo: path not owned by current user.");
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("delete-logo", { body: { path: rel } });
      if (error) {
        console.error("Error deleting logo via edge function:", error);
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
        setValue("logoStoragePath", ""); // no storage path for mock
        showSuccess("Mock company logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    } else {
      const uploaded = await uploadFileToSupabaseStorage(file);
      if (uploaded) {
        setValue("logoUrl", uploaded.publicUrl);
        setValue("logoWidth", 100);
        setValue("logoHeight", 50);
        setValue("logoFit", "contain");
        setValue("logoStoragePath", uploaded.path);
        showSuccess("Company logo uploaded successfully!");
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
      setValue("logoStoragePath", "");
      showSuccess("Mock company logo removed successfully!");
    } else {
      await deleteFileFromSupabaseStorage();
      setValue("logoUrl", "");
      setValue("logoWidth", 100);
      setValue("logoHeight", 50);
      setValue("logoFit", "contain");
      setValue("logoStoragePath", "");
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
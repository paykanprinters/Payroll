"use client";

import React from "react";
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { showSuccess } from "@/utils/toast";

interface CompanyLogoUploadProps {
  canEdit: boolean;
}

const CompanyLogoUpload: React.FC<CompanyLogoUploadProps> = ({ canEdit }) => {
  const { setValue, watch } = useFormContext();
  const logoUrl = watch("logoUrl");
  const logoWidth = watch("logoWidth");
  const logoHeight = watch("logoHeight");
  const logoFit = watch("logoFit");

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setValue("logoUrl", dataUrl);
        // Reset to default dimensions and fit when new logo is uploaded
        setValue("logoWidth", 100);
        setValue("logoHeight", 50);
        setValue("logoFit", "contain");
        showSuccess("Company logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setValue("logoUrl", "");
    setValue("logoWidth", 100); // Reset to default size
    setValue("logoHeight", 50); // Reset to default size
    setValue("logoFit", "contain"); // Reset to default fit
    showSuccess("Company logo removed successfully!");
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
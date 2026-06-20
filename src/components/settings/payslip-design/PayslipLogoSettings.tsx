import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces";

interface PayslipLogoSettingsProps {
  settings: PayslipDesignSettings;
  onPayslipLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePayslipLogo: () => void;
  onPayslipLogoWidthChange: (value: number[]) => void;
  onPayslipLogoHeightChange: (value: number[]) => void;
  onPayslipLogoFitChange: (value: "contain" | "cover" | "fill" | "none" | "scale-down") => void;
}

const PayslipLogoSettings: React.FC<PayslipLogoSettingsProps> = ({
  settings,
  onPayslipLogoUpload,
  onRemovePayslipLogo,
  onPayslipLogoWidthChange,
  onPayslipLogoHeightChange,
  onPayslipLogoFitChange,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Payslip Logo</h3>
      <p className="text-sm text-muted-foreground">
        Uses the company logo from Settings → Company Details by default. Upload here only if you need a different payslip logo.
      </p>
      <div className="flex items-center gap-2">
        <Label htmlFor="payslipLogo">Upload Payslip Logo</Label>
        <Input
          id="payslipLogo"
          type="file"
          accept="image/*"
          onChange={onPayslipLogoUpload}
          className="mt-1 flex-1"
        />
        {settings.payslipLogoUrl && (
          <Button type="button" variant="outline" onClick={onRemovePayslipLogo} className="mt-1">
            Remove Logo
          </Button>
        )}
      </div>
      {settings.payslipLogoUrl && (
        <div className="mt-4 space-y-4">
          <Label>Payslip Logo Preview</Label>
          <div className="flex items-center space-x-4 mt-2 border p-2 rounded-md">
            <img
              src={settings.payslipLogoUrl}
              alt="Payslip Logo"
              style={{ width: settings.payslipLogoWidth, height: settings.payslipLogoHeight, objectFit: settings.payslipLogoFit }}
              className="rounded-md border p-1"
            />
            <div className="flex-1 space-y-2">
              <div>
                <Label htmlFor="payslipLogoWidth">Width ({settings.payslipLogoWidth}px)</Label>
                <Slider
                  id="payslipLogoWidth"
                  min={40}
                  max={320}
                  step={1}
                  value={[settings.payslipLogoWidth || 180]}
                  onValueChange={onPayslipLogoWidthChange}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="payslipLogoHeight">Height ({settings.payslipLogoHeight}px)</Label>
                <Slider
                  id="payslipLogoHeight"
                  min={24}
                  max={120}
                  step={1}
                  value={[settings.payslipLogoHeight || 60]}
                  onValueChange={onPayslipLogoHeightChange}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="payslipLogoFit">Fit</Label>
                <Select onValueChange={onPayslipLogoFitChange} value={settings.payslipLogoFit}>
                  <SelectTrigger id="payslipLogoFit" className="mt-1">
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
  );
};

export default PayslipLogoSettings;
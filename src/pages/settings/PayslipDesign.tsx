"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowUp, ArrowDown } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces"; // Import the updated interface

// Define default settings for payslip elements
const defaultPayslipSettings: PayslipDesignSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true,
  showBankDetails: true,
  showYTD: true,
  showHourlyRate: true,
  sectionOrder: ["Earnings", "Deductions"],
  layoutSize: "A4",
  earningsDeductionsLayout: "deductions-left-earnings-right",
  payslipLogoUrl: '',
  payslipLogoWidth: 100,
  payslipLogoHeight: 50,
  payslipLogoFit: 'contain',
};

type SectionName = "Earnings" | "Deductions"; // Only Earnings and Deductions are orderable

const PayslipDesign: React.FC = () => {
  const [settings, setSettings] = useState<PayslipDesignSettings>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    const initial = savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings;
    // Ensure new fields are initialized if not present in saved settings
    return {
      ...initial,
      payslipLogoUrl: localStorage.getItem('payslipDesignLogoUrl') || initial.payslipLogoUrl || '',
      payslipLogoWidth: parseFloat(localStorage.getItem('payslipDesignLogoWidth') || initial.payslipLogoWidth?.toString() || '100'),
      payslipLogoHeight: parseFloat(localStorage.getItem('payslipDesignLogoHeight') || initial.payslipLogoHeight?.toString() || '50'),
      payslipLogoFit: (localStorage.getItem('payslipDesignLogoFit') as "contain" | "cover" | "fill" | "none" | "scale-down") || initial.payslipLogoFit || 'contain',
    };
  });

  const handleToggleChange = (key: keyof PayslipDesignSettings, checked: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: checked }));
  };

  const handleLayoutSizeChange = (value: "Letter" | "A4" | "A5") => {
    setSettings((prev) => ({ ...prev, layoutSize: value }));
  };

  const handleEarningsDeductionsLayoutChange = (value: "deductions-left-earnings-right" | "earnings-left-deductions-right") => {
    setSettings((prev) => ({ ...prev, earningsDeductionsLayout: value }));
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    setSettings((prev) => {
      const newOrder = [...prev.sectionOrder];
      const [movedItem] = newOrder.splice(index, 1);
      if (direction === "up" && index > 0) {
        newOrder.splice(index - 1, 0, movedItem);
      } else if (direction === "down" && index < newOrder.length - 1) {
        newOrder.splice(index + 1, 0, movedItem);
      } else {
        newOrder.splice(index, 0, movedItem); // Put it back if no move
      }
      return { ...prev, sectionOrder: newOrder };
    });
  };

  const handlePayslipLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setSettings(prev => ({ ...prev, payslipLogoUrl: dataUrl }));
        localStorage.setItem('payslipDesignLogoUrl', dataUrl);
        showSuccess("Payslip logo uploaded successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePayslipLogo = () => {
    setSettings(prev => ({ ...prev, payslipLogoUrl: '', payslipLogoWidth: 100, payslipLogoHeight: 50, payslipLogoFit: 'contain' }));
    localStorage.removeItem('payslipDesignLogoUrl');
    localStorage.removeItem('payslipDesignLogoWidth');
    localStorage.removeItem('payslipDesignLogoHeight');
    localStorage.removeItem('payslipDesignLogoFit');
    showSuccess("Payslip logo removed successfully!");
  };

  const handlePayslipLogoWidthChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, payslipLogoWidth: value[0] }));
    localStorage.setItem('payslipDesignLogoWidth', value[0].toString());
  };

  const handlePayslipLogoHeightChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, payslipLogoHeight: value[0] }));
    localStorage.setItem('payslipDesignLogoHeight', value[0].toString());
  };

  const handlePayslipLogoFitChange = (value: "contain" | "cover" | "fill" | "none" | "scale-down") => {
    setSettings(prev => ({ ...prev, payslipLogoFit: value }));
    localStorage.setItem('payslipDesignLogoFit', value);
  };

  const handleSaveSettings = () => {
    localStorage.setItem("payslipDesignSettings", JSON.stringify(settings));
    // Also save individual logo settings to ensure they persist even if the main settings object is not fully reloaded
    localStorage.setItem('payslipDesignLogoUrl', settings.payslipLogoUrl || '');
    localStorage.setItem('payslipDesignLogoWidth', settings.payslipLogoWidth?.toString() || '100');
    localStorage.setItem('payslipDesignLogoHeight', settings.payslipLogoHeight?.toString() || '50');
    localStorage.setItem('payslipDesignLogoFit', settings.payslipLogoFit || 'contain');

    showSuccess("Payslip design settings saved!");
    window.dispatchEvent(new Event('payslipDesignUpdated'));
  };

  // Retrieve company details from localStorage for preview fallback
  const companyTradingName = localStorage.getItem('companyTradingName') || "Your Company Name";
  const companyLegalName = localStorage.getItem('companyLegalName') || "Your Company Legal Name";
  const companyRegistrationNumber = localStorage.getItem('companyRegistrationNumber') || "N/A";
  const vatRegistrationNumber = localStorage.getItem('vatRegistrationNumber') || "N/A";
  const physicalAddress = localStorage.getItem('physicalAddress') || "123 Corporate Ave, Business City, 1234";
  const mainContactNumber = localStorage.getItem('mainContactNumber') || "+27 11 123 4567";
  const companyEmail = localStorage.getItem('companyEmail') || "info@yourcompany.co.za";
  const companyWebsite = localStorage.getItem('companyWebsite') || "www.yourcompany.co.za";
  const companyLogoUrl = localStorage.getItem('companyLogoUrl'); // Main company logo
  const companyLogoSize = parseFloat(localStorage.getItem('companyLogoSize') || '40');

  const renderSection = (section: SectionName) => {
    switch (section) {
      case "Earnings":
        return settings.showEarningsBreakdown && (
          <div key="earnings" className="space-y-1">
            <h4 className="font-bold text-sm mb-1 underline">EARNINGS</h4>
            <p className="text-xs flex justify-between"><span>Basic Salary:</span> <span>R 20,000.00</span></p>
            <p className="text-xs flex justify-between"><span>Travel Allowance:</span> <span>R 2,000.00</span></p>
            <p className="text-xs flex justify-between"><span>Overtime:</span> <span>R 500.00</span></p>
            <p className="text-xs font-bold mt-2 flex justify-between border-t pt-1"><span>GROSS EARNINGS</span> <span>R 22,500.00</span></p>
          </div>
        );
      case "Deductions":
        return settings.showDeductionsBreakdown && (
          <div key="deductions" className="space-y-1">
            <h4 className="font-bold text-sm mb-1 underline">DEDUCTIONS</h4>
            <p className="text-xs flex justify-between"><span>PAYE:</span> <span>R 3,000.00</span></p>
            <p className="text-xs flex justify-between"><span>UIF:</span> <span>R 177.12</span></p>
            <p className="text-xs flex justify-between"><span>SDL:</span> <span>R 200.00</span></p>
            <p className="text-xs flex justify-between"><span>Provident Fund:</span> <span>R 1,500.00</span></p>
            <p className="text-xs font-bold mt-2 flex justify-between border-t pt-1"><span>TOTAL DEDUCTIONS</span> <span>R 4,877.12</span></p>
          </div>
        );
      default:
        return null;
    }
  };

  const getPreviewCardClasses = (layoutSize: "Letter" | "A4" | "A5") => {
    switch (layoutSize) {
      case "Letter":
        return "w-[215.9mm] min-h-[279.4mm] p-6"; // US Letter
      case "A5":
        return "w-[148mm] min-h-[210mm] p-4 text-xs"; // A5
      case "A4":
      default:
        return "w-[210mm] min-h-[297mm] p-8"; // A4
    }
  };

  const renderMainContentPreview = () => {
    const earningsContent = renderSection("Earnings");
    const deductionsContent = renderSection("Deductions");

    const leftColumnContent = settings.earningsDeductionsLayout === "deductions-left-earnings-right" ? deductionsContent : earningsContent;
    const rightColumnContent = settings.earningsDeductionsLayout === "deductions-left-earnings-right" ? earningsContent : deductionsContent;

    return (
      <div className="grid grid-cols-2 gap-6 mt-4">
        <div className="text-left">
          {leftColumnContent}
        </div>
        <div className="text-left">
          {rightColumnContent}
        </div>
      </div>
    );
  };

  // Determine which logo to use for the preview
  const previewLogoUrl = settings.payslipLogoUrl || companyLogoUrl;
  const previewLogoWidth = settings.payslipLogoUrl ? settings.payslipLogoWidth : companyLogoSize;
  const previewLogoHeight = settings.payslipLogoUrl ? settings.payslipLogoHeight : companyLogoSize;
  const previewLogoFit = settings.payslipLogoUrl ? settings.payslipLogoFit : 'contain';


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payslip Design</CardTitle>
          <CardDescription>
            Customize the layout and content of your employee payslips.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Section */}
          <div className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Layout Options</h3>
              <div>
                <Label htmlFor="layoutSize">Paper Size</Label>
                <Select onValueChange={handleLayoutSizeChange} value={settings.layoutSize}>
                  <SelectTrigger id="layoutSize" className="mt-1 w-[180px]">
                    <SelectValue placeholder="Select paper size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Letter">US Letter (8.5 x 11 in)</SelectItem>
                    <SelectItem value="A4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="A5">A5 (148 x 210 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="earningsDeductionsLayout">Earnings/Deductions Layout</Label>
                <Select onValueChange={handleEarningsDeductionsLayoutChange} value={settings.earningsDeductionsLayout}>
                  <SelectTrigger id="earningsDeductionsLayout" className="mt-1 w-[250px]">
                    <SelectValue placeholder="Select layout" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deductions-left-earnings-right">Deductions Left, Earnings Right</SelectItem>
                    <SelectItem value="earnings-left-deductions-right">Earnings Left, Deductions Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Visibility Options</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="showCompanyLogo">Show Company Logo</Label>
                <Switch
                  id="showCompanyLogo"
                  checked={settings.showCompanyLogo}
                  onCheckedChange={(checked) => handleToggleChange("showCompanyLogo", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showCompanyDetails">Show Company Details</Label>
                <Switch
                  id="showCompanyDetails"
                  checked={settings.showCompanyDetails}
                  onCheckedChange={(checked) => handleToggleChange("showCompanyDetails", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showEmployeeDetails">Show Employee Details</Label>
                <Switch
                  id="showEmployeeDetails"
                  checked={settings.showEmployeeDetails}
                  onCheckedChange={(checked) => handleToggleChange("showEmployeeDetails", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showHourlyRate">Show Employee Hourly Rate</Label>
                <Switch
                  id="showHourlyRate"
                  checked={settings.showHourlyRate}
                  onCheckedChange={(checked) => handleToggleChange("showHourlyRate", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showEarningsBreakdown">Show Earnings Breakdown</Label>
                <Switch
                  id="showEarningsBreakdown"
                  checked={settings.showEarningsBreakdown}
                  onCheckedChange={(checked) => handleToggleChange("showEarningsBreakdown", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showDeductionsBreakdown">Show Deductions Breakdown</Label>
                <Switch
                  id="showDeductionsBreakdown"
                  checked={settings.showDeductionsBreakdown}
                  onCheckedChange={(checked) => handleToggleChange("showDeductionsBreakdown", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showLeaveSummary">Show Leave Summary</Label>
                <Switch
                  id="showLeaveSummary"
                  checked={settings.showLeaveSummary}
                  onCheckedChange={(checked) => handleToggleChange("showLeaveSummary", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showBankDetails">Show Bank Details</Label>
                <Switch
                  id="showBankDetails"
                  checked={settings.showBankDetails}
                  onCheckedChange={(checked) => handleToggleChange("showBankDetails", checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showYTD">Show YTD Calculations</Label>
                <Switch
                  id="showYTD"
                  checked={settings.showYTD}
                  onCheckedChange={(checked) => handleToggleChange("showYTD", checked)}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Section Order</h3>
              <p className="text-sm text-muted-foreground">Use the arrows to reorder the main content sections. Net Pay will always appear at the bottom.</p>
              <div className="space-y-2">
                {settings.sectionOrder.map((section, index) => (
                  <div key={section} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <span className="font-medium">{section}</span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleMoveSection(index, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleMoveSection(index, "down")}
                        disabled={index === settings.sectionOrder.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* New Payslip Logo Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payslip Logo</h3>
              <p className="text-sm text-muted-foreground">Upload a specific logo for payslips, overriding the main company logo if provided.</p>
              <div className="flex items-center gap-2">
                <Label htmlFor="payslipLogo">Upload Payslip Logo</Label>
                <Input
                  id="payslipLogo"
                  type="file"
                  accept="image/*"
                  onChange={handlePayslipLogoUpload}
                  className="mt-1 flex-1"
                />
                {settings.payslipLogoUrl && (
                  <Button type="button" variant="outline" onClick={handleRemovePayslipLogo} className="mt-1">
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
                          min={20}
                          max={200}
                          step={1}
                          value={[settings.payslipLogoWidth || 100]}
                          onValueChange={handlePayslipLogoWidthChange}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payslipLogoHeight">Height ({settings.payslipLogoHeight}px)</Label>
                        <Slider
                          id="payslipLogoHeight"
                          min={20}
                          max={100}
                          step={1}
                          value={[settings.payslipLogoHeight || 50]}
                          onValueChange={handlePayslipLogoHeightChange}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="payslipLogoFit">Fit</Label>
                        <Select onValueChange={handlePayslipLogoFitChange} value={settings.payslipLogoFit}>
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

            <Button onClick={handleSaveSettings} className="w-full">
              Save Payslip Design
            </Button>
          </div>

          {/* Payslip Preview */}
          <div className={cn(
            "p-6 border rounded-lg shadow-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mx-auto",
            getPreviewCardClasses(settings.layoutSize)
          )}>
            {/* Company Header */}
            <div className="flex justify-between items-start mb-4">
              {settings.showCompanyLogo && previewLogoUrl && (
                <img
                  src={previewLogoUrl}
                  alt="Company Logo"
                  style={{ width: previewLogoWidth, height: previewLogoHeight, objectFit: previewLogoFit }}
                  className="rounded-md"
                />
              )}
              <div className={cn("text-right text-xs", !settings.showCompanyLogo && "w-full")}>
                <h2 className="text-md font-bold">{companyLegalName}</h2>
                {companyTradingName && companyTradingName !== companyLegalName && (
                  <p className="text-sm">{companyTradingName}</p>
                )}
                {settings.showCompanyDetails && (
                  <>
                    <p>{physicalAddress}</p>
                    <p>Reg. No: {companyRegistrationNumber}</p>
                    <p>VAT No: {vatRegistrationNumber}</p>
                    <p>Tel: {mainContactNumber}</p>
                    <p>Email: {companyEmail}</p>
                    <p>Web: {companyWebsite}</p>
                  </>
                )}
              </div>
            </div>

            <Separator className="my-4" />

            <h3 className="text-lg font-bold text-center mb-3">PAYSLIP</h3>
            <div className="text-center text-sm mb-4">
              <p><span className="font-semibold">PAY PERIOD:</span> 01/07/2024 - 31/07/2024</p>
              <p><span className="font-semibold">PAY DATE:</span> 25/07/2024</p>
            </div>

            <Separator className="my-4" />

            {/* Employee & Bank Details */}
            {settings.showEmployeeDetails && (
              <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                <div className="space-y-1">
                  <p><span className="font-semibold">Employee Name:</span> John Doe</p>
                  <p><span className="font-semibold">Employee No:</span> EMP001</p>
                  <p><span className="font-semibold">ID No:</span> 9001015000087</p>
                  <p><span className="font-semibold">Job Title:</span> Software Developer</p>
                  {settings.showHourlyRate && (
                    <p><span className="font-semibold">Hourly Rate:</span> R 150.00</p>
                  )}
                  <p><span className="font-semibold">Tax No:</span> 1234567890</p>
                </div>
                {settings.showBankDetails && (
                  <div className="space-y-1 text-right">
                    <p><span className="font-semibold">Bank Name:</span> FNB</p>
                    <p><span className="font-semibold">Account No:</span> *********1234</p>
                    <p><span className="font-semibold">Branch Code:</span> 250655</p>
                    <p><span className="font-semibold">Account Type:</span> Cheque</p>
                  </div>
                )}
              </div>
            )}

            <Separator className="my-4" />

            {/* Dynamic Sections (Earnings/Deductions) */}
            {renderMainContentPreview()}

            <Separator className="my-4" />

            {/* Net Pay (Always at bottom) */}
            <div className="flex justify-between items-center pt-2 mt-2">
              <h3 className="text-lg font-bold">NET PAY</h3>
              <h3 className="text-lg font-bold">R 17,622.88</h3>
            </div>
            
            {/* Leave Summary (Moved below Net Pay) */}
            {settings.showLeaveSummary && (
              <div className="mt-4 pt-2 border-t border-dashed">
                <h4 className="font-bold text-sm mb-1 underline">LEAVE SUMMARY</h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p>Annual Leave Remaining:</p> <p className="text-right">15 days</p>
                  <p>Sick Leave Remaining:</p> <p className="text-right">10 days</p>
                </div>
              </div>
            )}

            {/* YTD Calculations */}
            {settings.showYTD && (
              <div className="mt-4 pt-2 border-t border-dashed">
                <h4 className="font-bold text-sm mb-1 underline">YEAR TO DATE (YTD)</h4>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <p>Gross Earnings YTD:</p> <p className="text-right">R 157,500.00</p>
                  <p>Total Deductions YTD:</p> <p className="text-right">R 43,877.12</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="mt-8 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">Important Note on Payslip Generation:</h3>
        <p className="text-sm">
          This "Payslip Design" section provides a visual preview and configuration options for how payslips *would* appear. The actual generation of payslips with dynamic data, complex calculations, and pixel-perfect rendering based on these settings would require a dedicated backend service and a robust reporting engine (e.g., PDF generation libraries). The settings saved here would be consumed by such a backend to produce the final payslip documents.
        </p>
      </div>
    </div>
  );
};

export default PayslipDesign;
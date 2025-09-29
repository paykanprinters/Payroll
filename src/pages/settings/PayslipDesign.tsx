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

// Define default settings for payslip elements
const defaultPayslipSettings = {
  showCompanyLogo: true,
  showCompanyDetails: true,
  showEmployeeDetails: true,
  showEarningsBreakdown: true,
  showDeductionsBreakdown: true,
  showLeaveSummary: true, // Now controlled by a toggle
  showBankDetails: true, // Now controlled by a toggle
  sectionOrder: ["Earnings", "Deductions"] as ("Earnings" | "Deductions")[], // Only Earnings and Deductions are orderable
  layoutSize: "A4" as "Letter" | "A4" | "A5", // Layout size setting
  earningsDeductionsLayout: "deductions-left-earnings-right" as "deductions-left-earnings-right" | "earnings-left-deductions-right", // New layout setting
};

type PayslipSettings = typeof defaultPayslipSettings;
type SectionName = "Earnings" | "Deductions"; // Only Earnings and Deductions are orderable

const PayslipDesign: React.FC = () => {
  const [settings, setSettings] = useState<PayslipSettings>(() => {
    const savedSettings = localStorage.getItem("payslipDesignSettings");
    return savedSettings ? JSON.parse(savedSettings) : defaultPayslipSettings;
  });

  const handleToggleChange = (key: keyof PayslipSettings, checked: boolean) => {
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

  const handleSaveSettings = () => {
    localStorage.setItem("payslipDesignSettings", JSON.stringify(settings));
    showSuccess("Payslip design settings saved!");
    // Dispatch a custom event if Payslips page needs to react immediately
    window.dispatchEvent(new Event('payslipDesignUpdated'));
  };

  // Placeholder for company details from localStorage (for preview)
  const companyTradingName = localStorage.getItem('companyTradingName') || "Your Company Name";
  const companyLogoUrl = localStorage.getItem('companyLogoUrl');
  const companyLogoSize = parseFloat(localStorage.getItem('companyLogoSize') || '40');

  const renderSection = (section: SectionName) => {
    switch (section) {
      case "Earnings":
        return settings.showEarningsBreakdown && (
          <div key="earnings" className="pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Earnings</h4>
            <p className="text-xs">Basic Salary: R 20,000.00</p>
            <p className="text-xs">Travel Allowance: R 2,000.00</p>
            <p className="text-xs">Overtime: R 500.00</p>
            <p className="text-xs font-semibold mt-1">Gross Earnings: R 22,500.00</p>
          </div>
        );
      case "Deductions":
        return settings.showDeductionsBreakdown && (
          <div key="deductions" className="pt-2 mt-2">
            <h4 className="font-semibold text-sm mb-1">Deductions</h4>
            <p className="text-xs">PAYE: R 3,000.00</p>
            <p className="text-xs">UIF: R 177.12</p>
            <p className="text-xs">SDL: R 200.00</p>
            <p className="text-xs">Provident Fund: R 1,500.00</p>
            <p className="text-xs font-semibold mt-1">Total Deductions: R 4,877.12</p>
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
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="border-t pt-2 text-left"> {/* Left column always text-left */}
          {leftColumnContent}
        </div>
        <div className="border-t pt-2 text-right"> {/* Right column always text-right */}
          {rightColumnContent}
        </div>
      </div>
    );
  };

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

            <Button onClick={handleSaveSettings} className="w-full">
              Save Payslip Design
            </Button>
          </div>

          {/* Payslip Preview */}
          <div className={cn(
            "p-6 border rounded-lg shadow-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 mx-auto",
            getPreviewCardClasses(settings.layoutSize)
          )}>
            <h3 className="text-xl font-bold mb-4 text-center">Payslip Preview</h3>
            <div className="border p-4 rounded-md space-y-3 text-sm">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                {settings.showCompanyLogo && companyLogoUrl && (
                  <img
                    src={companyLogoUrl}
                    alt="Company Logo"
                    style={{ width: companyLogoSize, height: companyLogoSize, objectFit: 'contain' }}
                    className="rounded-md"
                  />
                )}
                <div className={cn("text-right flex-grow", !settings.showCompanyLogo && "w-full")}>
                  <h2 className="text-lg font-bold">{companyTradingName}</h2>
                  {settings.showCompanyDetails && (
                    <>
                      <p className="text-xs">123 Corporate Ave, Business City, 1234</p>
                      <p className="text-xs">Reg. No: 2023/123456/07</p>
                      <p className="text-xs">Tax No: 9876543210</p>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Employee Details */}
              {settings.showEmployeeDetails && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p><span className="font-semibold">Employee Name:</span> John Doe</p>
                    <p><span className="font-semibold">Employee ID:</span> EMP001</p>
                    <p><span className="font-semibold">Job Title:</span> Software Developer</p>
                    {settings.showBankDetails && (
                      <div className="mt-2">
                        <p className="font-semibold">Bank Details:</p>
                        <p>Bank: FNB</p>
                        <p>Account No: *********1234</p>
                        <p>Branch Code: 250655</p>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p><span className="font-semibold">Pay Period:</span> 01/07/2024 - 31/07/2024</p>
                    <p><span className="font-semibold">Pay Date:</span> 25/07/2024</p>
                    <p><span className="font-semibold">Tax Ref No:</span> 123456789</p>
                    {settings.showLeaveSummary && (
                      <div className="mt-2">
                        <p className="font-semibold">Leave Summary:</p>
                        <p>Annual Leave: 15 days (Available)</p>
                        <p>Sick Leave: 10 days (Available)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Dynamic Sections (Earnings/Deductions) */}
              {renderMainContentPreview()}

              <Separator />

              {/* Net Pay (Always at bottom) */}
              <div className="flex justify-between items-center pt-2 mt-2">
                <h3 className="text-md font-bold">Net Pay</h3>
                <h3 className="text-md font-bold">R 17,622.88</h3>
              </div>
            </div>
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
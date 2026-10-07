import React from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces";

interface PayslipVisibilityOptionsProps {
  settings: PayslipDesignSettings;
  onToggleChange: (key: keyof PayslipDesignSettings, checked: boolean) => void;
}

const PayslipVisibilityOptions: React.FC<PayslipVisibilityOptionsProps> = ({
  settings,
  onToggleChange,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Visibility Options</h3>
      <div className="flex items-center justify-between">
        <Label htmlFor="showCompanyLogo">Show Company Logo</Label>
        <Switch
          id="showCompanyLogo"
          checked={settings.showCompanyLogo}
          onCheckedChange={(checked) => onToggleChange("showCompanyLogo", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showCompanyDetails">Show Company Details</Label>
        <Switch
          id="showCompanyDetails"
          checked={settings.showCompanyDetails}
          onCheckedChange={(checked) => onToggleChange("showCompanyDetails", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showEmployeeDetails">Show Employee Details</Label>
        <Switch
          id="showEmployeeDetails"
          checked={settings.showEmployeeDetails}
          onCheckedChange={(checked) => onToggleChange("showEmployeeDetails", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showHourlyRate">Show Employee Hourly Rate</Label>
        <Switch
          id="showHourlyRate"
          checked={settings.showHourlyRate}
          onCheckedChange={(checked) => onToggleChange("showHourlyRate", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showEmployeeIdNumber">Show Employee ID Number</Label>
        <Switch
          id="showEmployeeIdNumber"
          checked={!!settings.showEmployeeIdNumber}
          onCheckedChange={(checked) => onToggleChange("showEmployeeIdNumber", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showEmployeeTaxRefNumber">Show Employee Tax Reference</Label>
        <Switch
          id="showEmployeeTaxRefNumber"
          checked={!!settings.showEmployeeTaxRefNumber}
          onCheckedChange={(checked) => onToggleChange("showEmployeeTaxRefNumber", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showEmployeeAddress">Show Employee Address</Label>
        <Switch
          id="showEmployeeAddress"
          checked={!!settings.showEmployeeAddress}
          onCheckedChange={(checked) => onToggleChange("showEmployeeAddress", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showEarningsBreakdown">Show Earnings Breakdown</Label>
        <Switch
          id="showEarningsBreakdown"
          checked={settings.showEarningsBreakdown}
          onCheckedChange={(checked) => onToggleChange("showEarningsBreakdown", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showDeductionsBreakdown">Show Deductions Breakdown</Label>
        <Switch
          id="showDeductionsBreakdown"
          checked={settings.showDeductionsBreakdown}
          onCheckedChange={(checked) => onToggleChange("showDeductionsBreakdown", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showLoan">Show Loan Deduction and Balance</Label>
        <Switch
          id="showLoan"
          checked={!!settings.showLoan}
          onCheckedChange={(checked) => onToggleChange("showLoan", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showSavingsBalance">Show Savings Already Saved</Label>
        <Switch
          id="showSavingsBalance"
          checked={!!settings.showSavingsBalance}
          onCheckedChange={(checked) => onToggleChange("showSavingsBalance", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showLeaveSummary">Show Leave Summary</Label>
        <Switch
          id="showLeaveSummary"
          checked={settings.showLeaveSummary}
          onCheckedChange={(checked) => onToggleChange("showLeaveSummary", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showBankDetails">Show Bank Details</Label>
        <Switch
          id="showBankDetails"
          checked={settings.showBankDetails}
          onCheckedChange={(checked) => onToggleChange("showBankDetails", checked)}
        />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="showYTD">Show YTD Calculations</Label>
        <Switch
          id="showYTD"
          checked={settings.showYTD}
          onCheckedChange={(checked) => onToggleChange("showYTD", checked)}
        />
      </div>
    </div>
  );
};

export default PayslipVisibilityOptions;
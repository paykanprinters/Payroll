import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayslipDesignSettings } from "@/lib/mock-data-interfaces";

interface PayslipLayoutOptionsProps {
  settings: PayslipDesignSettings;
  onLayoutSizeChange: (value: "Letter" | "A4" | "A5") => void;
  onEarningsDeductionsLayoutChange: (value: "deductions-left-earnings-right" | "earnings-left-deductions-right") => void;
}

const PayslipLayoutOptions: React.FC<PayslipLayoutOptionsProps> = ({
  settings,
  onLayoutSizeChange,
  onEarningsDeductionsLayoutChange,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Layout Options</h3>
      <div>
        <Label htmlFor="layoutSize">Paper Size</Label>
        <Select onValueChange={onLayoutSizeChange} value={settings.layoutSize}>
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
        <Select onValueChange={onEarningsDeductionsLayoutChange} value={settings.earningsDeductionsLayout}>
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
  );
};

export default PayslipLayoutOptions;
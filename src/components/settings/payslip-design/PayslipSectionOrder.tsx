import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown } from "lucide-react";

type SectionName = "Earnings" | "Deductions";

interface PayslipSectionOrderProps {
  sectionOrder: SectionName[];
  onMoveSection: (index: number, direction: "up" | "down") => void;
}

const PayslipSectionOrder: React.FC<PayslipSectionOrderProps> = ({
  sectionOrder,
  onMoveSection,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Section Order</h3>
      <p className="text-sm text-muted-foreground">Use the arrows to reorder the main content sections. Net Pay will always appear at the bottom.</p>
      <div className="space-y-2">
        {sectionOrder.map((section, index) => (
          <div key={section} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
            <span className="font-medium">{section}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMoveSection(index, "up")}
                disabled={index === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onMoveSection(index, "down")}
                disabled={index === sectionOrder.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PayslipSectionOrder;
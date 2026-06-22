"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ReceiptText, Sparkles, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import KanPageBanner from "@/components/KanPageBanner";

interface PayslipsHeaderProps {
  onPreviewPaycheck?: () => void;
  onScrollToGenerate?: () => void;
  showAdminActions?: boolean;
  previewDisabled?: boolean;
}

const PayslipsHeader: React.FC<PayslipsHeaderProps> = ({
  onPreviewPaycheck,
  onScrollToGenerate,
  showAdminActions = false,
  previewDisabled = false,
}) => {
  return (
    <KanPageBanner
      icon={ReceiptText}
      title="Payslips"
      description="Review confidential payroll records, generate payslips, and export documents securely."
      actions={
        showAdminActions ? (
          <>
            {onPreviewPaycheck && (
              <Button
                onClick={onPreviewPaycheck}
                disabled={previewDisabled}
                variant="outline"
                className="border-white/25 bg-white/10 text-white hover:bg-white/15"
              >
                <Sparkles className="h-4 w-4" />
                Preview calculation
              </Button>
            )}
            {onScrollToGenerate && (
              <Button
                onClick={onScrollToGenerate}
                className="bg-white text-cyan-900 hover:bg-white/90"
              >
                Generate payslips
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/15"
            >
              <Link to="/payslips/irp5-export">
                <FileSpreadsheet className="h-4 w-4" />
                IRP5 export
              </Link>
            </Button>
          </>
        ) : undefined
      }
    />
  );
};

export default PayslipsHeader;

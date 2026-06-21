"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ReceiptText, Sparkles, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="kan-page-banner">
      <div className="kan-page-banner-glow" />
      <div className="kan-page-banner-orb" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3 md:items-center">
          <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/10">
            <ReceiptText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold leading-tight md:text-3xl">Payslips</h1>
            <p className="text-sm text-white/75">
              Review confidential payroll records, generate payslips, and export documents securely.
            </p>
          </div>
        </div>

        {showAdminActions && (
          <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default PayslipsHeader;

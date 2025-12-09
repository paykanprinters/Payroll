"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title?: string;
  html?: string;
  // Legacy/alternate
  isOpen?: boolean;
  onClose?: () => void;
  reportTitle?: string;
  reportContent?: string;
  documentType?: "payslip" | "report";
};

export default function ReportPreviewDialog(props: Props) {
  const open = props.open ?? props.isOpen ?? false;
  const handleOpenChange = (v: boolean) => {
    if (props.onOpenChange) props.onOpenChange(v);
    if (!v && props.onClose) props.onClose();
  };
  const title = props.title ?? props.reportTitle ?? "Preview";
  const html = props.html ?? props.reportContent ?? "";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          <ReportContentWrapper html={html} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
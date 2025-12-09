"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReportContentWrapper from "@/components/reports/ReportContentWrapper";

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  html: string
}

export default function ReportPreviewDialog({ open, onOpenChange, title, html }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto">
          <ReportContentWrapper html={html} />
        </div>
      </DialogContent>
    </Dialog>
  )
}
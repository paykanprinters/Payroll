"use client";

import React from "react";
import { sanitizeHTML } from "@/utils/sanitize-html";

type Props = {
  html?: string;
  className?: string;
  // Legacy/alternate props used elsewhere; treated as aliases
  reportTitle?: string;
  reportContent?: string;
  companyDetails?: any;
  reportDesignSettings?: any;
  isPdfGeneration?: boolean;
  onReadyForPdf?: () => void;
};

export default function ReportContentWrapper(props: Props) {
  const content = props.html ?? props.reportContent ?? "";
  const safe = sanitizeHTML(content);
  return (
    <div
      className={props.className ?? "prose max-w-none"}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
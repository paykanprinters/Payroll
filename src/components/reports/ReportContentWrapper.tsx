"use client";

import React from "react";
import { sanitizeHTML } from "@/utils/sanitize-html";

type Props = {
  html: string;
  className?: string;
};

export default function ReportContentWrapper({ html, className }: Props) {
  const safe = sanitizeHTML(html);
  return (
    <div
      className={className ?? "prose max-w-none"}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
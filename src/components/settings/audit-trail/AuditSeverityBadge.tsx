"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import type { AuditSeverity } from "@/lib/audit-trail";

const VARIANTS: Record<AuditSeverity, "default" | "secondary" | "destructive" | "outline"> = {
  info: "outline",
  change: "default",
  warning: "secondary",
  alert: "secondary",
  error: "destructive",
  auth: "default",
};

const LABELS: Record<AuditSeverity, string> = {
  info: "Info",
  change: "Change",
  warning: "Warning",
  alert: "Alert",
  error: "Error",
  auth: "Auth",
};

interface AuditSeverityBadgeProps {
  severity: AuditSeverity | string;
}

const AuditSeverityBadge: React.FC<AuditSeverityBadgeProps> = ({ severity }) => {
  const key = (severity in LABELS ? severity : "info") as AuditSeverity;
  return <Badge variant={VARIANTS[key]}>{LABELS[key]}</Badge>;
};

export default AuditSeverityBadge;

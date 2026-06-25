"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { leaveStatusBadgeVariant, leaveStatusLabel } from "@/lib/leave-status";
import type { LeaveEntry } from "@/lib/mock-data-interfaces";

interface LeaveStatusBadgeProps {
  status?: LeaveEntry["status"];
  className?: string;
}

const LeaveStatusBadge: React.FC<LeaveStatusBadgeProps> = ({ status, className }) => {
  const label = leaveStatusLabel(status);
  return (
    <Badge variant={leaveStatusBadgeVariant(status)} className={className}>
      {label}
    </Badge>
  );
};

export default LeaveStatusBadge;

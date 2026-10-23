import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeaveEntry } from "@/lib/mock-data-interfaces";
import { leaveDayLabel } from "@/lib/leave-timesheet-rows";

const LeaveDayBadge: React.FC<{ leaveType?: LeaveEntry["leaveType"] | null; className?: string }> = ({
  leaveType,
  className,
}) => {
  const label = leaveDayLabel(leaveType);
  if (!label) return null;
  return (
    <Badge
      variant="outline"
      title={leaveType ?? undefined}
      className={cn(
        label === "Sick"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-violet-200 bg-violet-50 text-violet-700",
        className
      )}
    >
      {label}
    </Badge>
  );
};

export default LeaveDayBadge;

import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { publicHolidayTitle } from "@/lib/timesheet-holidays";

const PublicHolidayBadge: React.FC<{ name?: string | null; className?: string }> = ({ name, className }) => {
  if (!name) return null;
  return (
    <Badge
      variant="outline"
      title={publicHolidayTitle(name)}
      className={cn("border-amber-200 bg-amber-50 text-amber-800", className)}
    >
      Public holiday
    </Badge>
  );
};

export default PublicHolidayBadge;

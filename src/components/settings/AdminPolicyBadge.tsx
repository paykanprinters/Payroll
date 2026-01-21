"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldOff } from "lucide-react";

type UserRole = "Admin" | "Manager" | "Staff" | "Viewer";

interface AdminPolicyBadgeProps {
  role: UserRole;
}

const AdminPolicyBadge: React.FC<AdminPolicyBadgeProps> = ({ role }) => {
  const isAdmin = role === "Admin";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="secondary"
          className={isAdmin ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}
        >
          {isAdmin ? (
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Policy: Admin (is_admin())
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <ShieldOff className="h-3.5 w-3.5" />
              Policy: Non-admin
            </span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        {isAdmin
          ? "This account will be treated as admin by RLS policies via is_admin()."
          : "This account is not admin; RLS policies limit access accordingly."}
      </TooltipContent>
    </Tooltip>
  );
};

export default AdminPolicyBadge;
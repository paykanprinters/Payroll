"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, ShieldOff } from "lucide-react";
import type { UserRole } from "@/context/auth-types";

interface AdminPolicyBadgeProps {
  role: UserRole;
}

const AdminPolicyBadge: React.FC<AdminPolicyBadgeProps> = ({ role }) => {
  const isAdmin = role === "Admin";

  if (role === "Accountant") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="bg-sky-100 text-sky-800">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Policy: Read-only (is_payroll_reader())
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          Can read payroll data only while active, before the access end date, and after two-factor sign-in.
          The database refuses every change from this account.
        </TooltipContent>
      </Tooltip>
    );
  }

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
"use client";

import React from "react";
import { Users, PlusCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import KanPageBanner from "@/components/KanPageBanner";

interface EmployeesHeaderProps {
  onAddEmployee?: () => void;
  isMutating?: boolean;
}

const EmployeesHeader: React.FC<EmployeesHeaderProps> = ({ onAddEmployee, isMutating = false }) => {
  return (
    <KanPageBanner
      icon={Users}
      title="Employees"
      description="Maintain complete employee records for payroll, timesheets, and the staff portal."
      actions={
        onAddEmployee ? (
          <Button
            onClick={onAddEmployee}
            disabled={isMutating}
            className="bg-white text-cyan-900 hover:bg-white/90"
          >
            {isMutating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            Add employee
          </Button>
        ) : undefined
      }
    />
  );
};

export default EmployeesHeader;

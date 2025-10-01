"use client";

import React from "react";
import { Outlet } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const PayrollLayout: React.FC = () => {
  return (
    <div className="space-y-6 p-4 pb-16 md:block">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Payroll</h2>
        <p className="text-muted-foreground">
          Manage all aspects of employee payroll, including upcoming cycles and actions.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex-1 lg:max-w-2xl">
        <Outlet /> {/* This is where the UpcomingPayrollCard will render */}
      </div>
    </div>
  );
};

export default PayrollLayout;
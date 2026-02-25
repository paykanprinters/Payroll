"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Landmark, ReceiptText, Settings, Users, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DashboardPrimaryActions: React.FC = () => {
  const actions = [
    {
      to: "/payroll/runs",
      label: "Payroll runs",
      icon: Landmark,
      variant: "default" as const,
    },
    {
      to: "/timesheet",
      label: "Timesheets",
      icon: Timer,
      variant: "outline" as const,
    },
    {
      to: "/payslips/overview",
      label: "Payslips",
      icon: ReceiptText,
      variant: "outline" as const,
    },
    {
      to: "/employees",
      label: "Employees",
      icon: Users,
      variant: "outline" as const,
    },
    {
      to: "/settings/company-details",
      label: "Settings",
      icon: Settings,
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">Quick actions</div>
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to}
                className={cn(
                  buttonVariants({ variant: a.variant, size: "sm" }),
                  "rounded-full",
                  a.variant === "outline" && "bg-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {a.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPrimaryActions;

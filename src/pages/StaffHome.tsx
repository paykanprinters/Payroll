"use client";

import React from "react";
import StaffBranding from "@/components/staff/StaffBranding";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const StaffHome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-4 p-2 sm:p-4">
      <StaffBranding />

      <Card className="border rounded-xl">
        <CardHeader>
          <CardTitle>Welcome{user?.email ? `, ${user.email}` : ""}</CardTitle>
          <CardDescription>Your personal payroll area</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Link to="/payslips" className="rounded-md border p-4 hover:bg-muted transition">
            <div className="font-semibold">Payslips</div>
            <div className="text-sm text-muted-foreground">View and download your payslips</div>
          </Link>
          <Link to="/timesheet" className="rounded-md border p-4 hover:bg-muted transition">
            <div className="font-semibold">Timesheets</div>
            <div className="text-sm text-muted-foreground">Submit and review your timesheets</div>
          </Link>
          <Link to="/vacation-absence" className="rounded-md border p-4 hover:bg-muted transition">
            <div className="font-semibold">Leave</div>
            <div className="text-sm text-muted-foreground">Request leave and track approvals</div>
          </Link>
          <Link to="/savings" className="rounded-md border p-4 hover:bg-muted transition">
            <div className="font-semibold">Savings</div>
            <div className="text-sm text-muted-foreground">Manage your savings plans</div>
          </Link>
          <Link to="/profile" className="rounded-md border p-4 hover:bg-muted transition">
            <div className="font-semibold">Profile</div>
            <div className="text-sm text-muted-foreground">Update your personal information</div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffHome;
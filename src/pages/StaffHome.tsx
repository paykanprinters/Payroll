"use client";

import React from "react";
import StaffBranding from "@/components/staff/StaffBranding";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const StaffHome: React.FC = () => {
  const { user } = useAuth();

  const portalType = (import.meta.env.VITE_PORTAL || "admin").toLowerCase();

  return (
    <div className="space-y-6">
      <Alert className="border-slate-200 bg-white">
        <AlertTitle className="text-slate-900">Active build</AlertTitle>
        <AlertDescription className="text-slate-600">
          {portalType === "staff" ? "Staff Portal" : "Admin/Manager Console"}
        </AlertDescription>
      </Alert>

      <StaffBranding />

      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl -tracking-tight">Welcome{user?.email ? `, ${user.email}` : ""}</CardTitle>
          <CardDescription className="text-base">Your personal payroll area</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/payslips"
            className="group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="font-semibold">Payslips</div>
            <div className="mt-1 text-sm text-muted-foreground">View and download your payslips</div>
          </Link>
          <Link
            to="/timesheet"
            className="group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="font-semibold">Timesheets</div>
            <div className="mt-1 text-sm text-muted-foreground">Submit and review your timesheets</div>
          </Link>
          <Link
            to="/vacation-absence"
            className="group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="font-semibold">Leave</div>
            <div className="mt-1 text-sm text-muted-foreground">Request leave and track approvals</div>
          </Link>
          <Link
            to="/savings"
            className="group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="font-semibold">Savings</div>
            <div className="mt-1 text-sm text-muted-foreground">Manage your savings plans</div>
          </Link>
          <Link
            to="/profile"
            className="group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="font-semibold">Profile</div>
            <div className="mt-1 text-sm text-muted-foreground">Update your personal information</div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default StaffHome;
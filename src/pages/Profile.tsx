"use client";

import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

import AccountProfileSection from "@/pages/profile/AccountProfileSection";
import EmployeeProfileSection from "@/pages/profile/EmployeeProfileSection";
import AccessScopeCallout from "@/pages/profile/AccessScopeCallout";

const Profile: React.FC = () => {
  const { user, isLoadingAuth } = useAuth();
  const role = user?.role;
  const isStaff = role === "Staff";

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const title = isStaff ? "My Profile" : "My Account";
  const subtitle = isStaff
    ? "View and update your employee contact information."
    : "Manage your account details.";

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
      </Card>

      <AccountProfileSection />

      {isStaff && <EmployeeProfileSection />}

      <AccessScopeCallout
        title="Access scope"
        description={
          isStaff
            ? "Your profile page is limited to your own employee record. Administrators and managers manage organization-wide records from their respective pages."
            : "Your account page is limited to your own login and profile details."
        }
      />
    </div>
  );
};

export default Profile;

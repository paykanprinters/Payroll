"use client";

import React from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "lucide-react";
import AccountProfileSection from "@/pages/profile/AccountProfileSection";
import EmployeeProfileSection from "@/pages/profile/EmployeeProfileSection";

const StaffProfilePage: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="border-cyan-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-cyan-700" />
            My profile
          </CardTitle>
          <CardDescription>
            Your account details and employee contact information linked to this portal.
          </CardDescription>
        </CardHeader>
      </Card>

      <AccountProfileSection />
      <EmployeeProfileSection />
    </div>
  );
};

export default StaffProfilePage;

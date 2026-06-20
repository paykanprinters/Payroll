"use client";

import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, Mail, UserX, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STAFF_LOGIN_PATH } from "@/lib/staff-portal";
import { supabase } from "@/integrations/supabase/client";

type Reason = "not_linked" | "portal_disabled";

const copy: Record<
  Reason,
  { title: string; description: string; icon: React.ElementType }
> = {
  not_linked: {
    title: "Account not linked",
    description:
      "Your login is not linked to an employee record yet. Ask your payroll administrator to link your user account in Employees → Profile → Portal access.",
    icon: UserX,
  },
  portal_disabled: {
    title: "Portal access disabled",
    description:
      "Portal access is turned off on your employee profile. Contact payroll to enable “Portal access” before you can use the employee portal.",
    icon: Lock,
  },
};

const StaffPortalAccessDenied: React.FC<{ reason: Reason }> = ({ reason }) => {
  const Icon = copy[reason].icon;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/40 to-fuchsia-50/30 p-6">
      <Card className="max-w-lg w-full border-cyan-100 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Icon className="h-6 w-6" />
          </div>
          <CardTitle>{copy[reason].title}</CardTitle>
          <CardDescription>{copy[reason].description}</CardDescription>
        </CardHeader>
        <CardContent className="rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Need help? Email your payroll team at info@kanprinters.co.za</span>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant="secondary">
            <Link to={STAFF_LOGIN_PATH}>Back to staff login</Link>
          </Button>
          <Button variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default StaffPortalAccessDenied;

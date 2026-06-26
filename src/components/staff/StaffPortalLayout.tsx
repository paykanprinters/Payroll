"use client";

import React, { Suspense } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Loader2, Sparkles, LogOut } from "lucide-react";
import StaffPortalSidebar from "@/components/staff/StaffPortalSidebar";
import { useStaffPortalContext } from "@/context/StaffPortalContext";
import { supabase } from "@/integrations/supabase/client";
import { STAFF_LOGIN_PATH } from "@/lib/staff-portal";
import { recordAuthEvent } from "@/lib/audit-trail";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const StaffPortalLayout: React.FC = () => {
  const { employee } = useStaffPortalContext();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (user) {
      await recordAuthEvent("signed_out", {
        userId: user.id,
        email: user.email,
        role: user.role,
        portal: "staff",
      });
    }
    await supabase.auth.signOut();
    navigate(STAFF_LOGIN_PATH, { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
      <StaffPortalSidebar onSignOut={handleSignOut} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-30 border-b border-cyan-100/80 bg-white/85 px-4 pb-4 backdrop-blur-md md:px-8"
          style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 pt-10 md:pt-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                  {employee.firstName} {employee.lastName}
                </h1>
                <Badge variant="secondary" className="border-cyan-200 bg-cyan-50 text-cyan-800">
                  Staff
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {employee.jobTitle}
                {employee.customEmployeeId ? ` · ${employee.customEmployeeId}` : ""}
              </p>
              <p className="mt-1 hidden text-xs text-muted-foreground md:block">
                <Sparkles className="mr-1 inline h-3.5 w-3.5 text-fuchsia-500" />
                Your personal payroll — payslips, leave, loans & savings
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-cyan-200 text-slate-700 hover:bg-red-50 hover:text-red-700"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </Button>
          </div>
        </header>

        <main
          className="flex-1 px-4 py-6 md:px-8 md:py-8"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
        >
          <Suspense
            fallback={
              <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default StaffPortalLayout;

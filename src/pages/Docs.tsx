"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocsHeader from "@/components/docs/DocsHeader";
import DocsQuickLinks from "@/components/docs/DocsQuickLinks";
import DocsWorkflowOverview from "@/components/docs/DocsWorkflowOverview";
import DocsGuidePanel from "@/components/docs/DocsGuidePanel";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/context/AuthContext";
import {
  ADMIN_GUIDE,
  ADMIN_QUICK_LINKS,
  DEVELOPER_GUIDE,
  STAFF_GUIDE,
  STAFF_QUICK_LINKS,
  filterQuickLinks,
  getDefaultDocsAudience,
  type DocsAudience,
} from "@/lib/docs-content";

const Docs: React.FC = () => {
  const { user } = useAuth();
  const [activeGuide, setActiveGuide] = useState<DocsAudience>("staff");

  React.useEffect(() => {
    if (user?.role) {
      setActiveGuide(getDefaultDocsAudience(user.role));
    }
  }, [user?.role]);

  const adminLinks = useMemo(
    () => filterQuickLinks(ADMIN_QUICK_LINKS, user?.role),
    [user?.role]
  );
  const staffLinks = useMemo(() => filterQuickLinks(STAFF_QUICK_LINKS, user?.role), [user?.role]);

  const showAdminWorkflow = user?.role === "Admin" || user?.role === "Manager";

  return (
    <div className="flex flex-col gap-4">
      <DocsHeader onRefresh={() => window.dispatchEvent(new Event("appFocusRefresh"))} />

      {showAdminWorkflow && <DocsWorkflowOverview />}

      <DocsQuickLinks
        title="Go to module"
        description="Jump straight to the area you are working on."
        links={user?.role === "Staff" ? staffLinks : adminLinks}
      />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Guides</CardTitle>
          <CardDescription>
            Choose the guide that matches your role. Content reflects this build&apos;s features and
            navigation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeGuide}
            onValueChange={(v) => setActiveGuide(v as DocsAudience)}
            className="w-full"
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              {(user?.role === "Admin" || user?.role === "Manager") && (
                <TabsTrigger value="admin" className="rounded-full text-xs sm:text-sm">
                  Administrator
                </TabsTrigger>
              )}
              <TabsTrigger value="staff" className="rounded-full text-xs sm:text-sm">
                Staff
              </TabsTrigger>
              {(user?.role === "Admin" || user?.role === "Manager") && (
                <TabsTrigger value="developer" className="rounded-full text-xs sm:text-sm">
                  Developer
                </TabsTrigger>
              )}
            </TabsList>

            {(user?.role === "Admin" || user?.role === "Manager") && (
              <TabsContent value="admin" className="mt-4">
                <ErrorBoundary fallbackTitle="Documentation error">
                  <DocsGuidePanel guide={ADMIN_GUIDE} />
                </ErrorBoundary>
              </TabsContent>
            )}

            <TabsContent value="staff" className="mt-4">
              <ErrorBoundary fallbackTitle="Documentation error">
                <DocsGuidePanel guide={STAFF_GUIDE} />
              </ErrorBoundary>
            </TabsContent>

            {(user?.role === "Admin" || user?.role === "Manager") && (
              <TabsContent value="developer" className="mt-4">
                <ErrorBoundary fallbackTitle="Documentation error">
                  <DocsGuidePanel guide={DEVELOPER_GUIDE} />
                </ErrorBoundary>
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Using this documentation</p>
          <p className="mt-2">
            Guides describe intended workflow — if the app behaviour differs, check{" "}
            <strong>Analytics → System health</strong> and <strong>To-Dos</strong> for blockers.
            Staff users on the dedicated portal should use <strong>/staff</strong> rather than admin
            URLs. For tax and statutory filing, always reconcile report totals against the payslip
            register before external submission.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Docs;

"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DocsHeader from "@/components/docs/DocsHeader";
import DocsQuickLinks from "@/components/docs/DocsQuickLinks";
import DocsWorkflowOverview from "@/components/docs/DocsWorkflowOverview";
import DocsGuidePanel from "@/components/docs/DocsGuidePanel";
import TrainingManualsSection from "@/components/docs/TrainingManualsSection";
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
  const [docsSection, setDocsSection] = useState<"training" | "reference">("training");

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

      {showAdminWorkflow && docsSection === "reference" && <DocsWorkflowOverview />}

      <DocsQuickLinks
        title="Go to module"
        description="Jump straight to the area you are working on."
        links={user?.role === "Staff" ? staffLinks : adminLinks}
      />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Learn the system</CardTitle>
          <CardDescription>
            Training manuals walk through each module step by step. Reference guides are shorter
            summaries for experienced users.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={docsSection}
            onValueChange={(v) => setDocsSection(v as "training" | "reference")}
            className="w-full"
          >
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
              <TabsTrigger value="training" className="rounded-full text-xs sm:text-sm">
                Training manuals
              </TabsTrigger>
              <TabsTrigger value="reference" className="rounded-full text-xs sm:text-sm">
                Reference guides
              </TabsTrigger>
            </TabsList>

            <TabsContent value="training" className="mt-0">
              <ErrorBoundary fallbackTitle="Training manuals error">
                <TrainingManualsSection role={user?.role} />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="reference" className="mt-0 space-y-4">
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Using this documentation</p>
          <p className="mt-2">
            Start with <strong>Training manuals</strong> when onboarding new payroll staff or
            employees. Use <strong>Reference guides</strong> for quick reminders. If behaviour
            differs from the manual, check <strong>Analytics → System health</strong> and{" "}
            <strong>To-Dos</strong> for blockers. Staff on the dedicated portal should use{" "}
            <strong>/staff</strong> rather than admin URLs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Docs;

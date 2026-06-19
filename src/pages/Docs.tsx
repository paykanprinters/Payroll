"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/context/AuthContext";

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-lg font-semibold text-slate-900">{title}</div>
      {description ? <div className="text-sm text-slate-600 leading-relaxed">{description}</div> : null}
    </div>
  );
}

function BulletList({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 leading-relaxed">
      {items.map((it, idx) => (
        <li key={idx}>{it}</li>
      ))}
    </ul>
  );
}

const Docs: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-semibold -tracking-tight text-slate-900">Documentation</h1>
          <p className="mt-2 text-slate-600 leading-relaxed max-w-3xl">
            This page explains how the system works, how to use it (Owner/Admin & Staff), and how to maintain it (Developer).
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary">Signed in as: {user?.role || "User"}</Badge>
          <span className="text-xs text-muted-foreground">Applies to this build and its current features.</span>
        </div>
      </div>

      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Guides</CardTitle>
          <CardDescription>
            Choose the guide that matches who is using the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="owner" className="w-full">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="owner">Owner / Admin Manual</TabsTrigger>
              <TabsTrigger value="staff">Staff Manual</TabsTrigger>
              <TabsTrigger value="dev">Developer / Maintainer</TabsTrigger>
            </TabsList>

            {/* OWNER / ADMIN */}
            <TabsContent value="owner" className="mt-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="rounded-2xl border">
                    <CardHeader>
                      <CardTitle>Owner / Admin User Manual</CardTitle>
                      <CardDescription>
                        For business owners, payroll administrators, and managers.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-6">
                          <SectionTitle
                            title="1) Core Concepts"
                            description="The system is centered around Employees, Timesheets, Pay Periods, and Payslips. Payroll generation creates or updates payslips for a chosen period."
                          />
                          <BulletList
                            items={[
                              <>Employees drive payroll rules (pay frequency, hourly vs salaried, etc.).</>,
                              <>Timesheets capture time in/out and breaks; they feed into payroll hours calculations.</>,
                              <>Pay Period selection determines what gets generated/exported.</>,
                              <>Payslips are the final output and can be previewed, printed, or downloaded.</>,
                            ]}
                          />

                          <Separator />

                          <SectionTitle
                            title="2) Daily Workflow (recommended)"
                            description="A simple operational flow that matches how the system is designed."
                          />
                          <BulletList
                            items={[
                              <>Maintain Employees (new hires, terminations, pay frequency, payment mode).</>,
                              <>Capture or import Timesheets for the period.</>,
                              <>Run payroll for the selected period (weekly/monthly).</>,
                              <>Review payslips (spot-check totals and deductions).</>,
                              <>Export or download payslips and related reports.</>,
                            ]}
                          />

                          <Separator />

                          <Accordion type="multiple" className="w-full">
                            <AccordionItem value="admin-employees">
                              <AccordionTrigger>Employees</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Add/edit employees (identity, role, pay frequency, payment mode, bank details).</>,
                                    <>Hourly/weekly workers are treated differently in work-hours rules (e.g., fixed break subtraction can apply).</>,
                                    <>Ensure every staff member is linked properly so their portal access is scoped correctly.</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="admin-timesheets">
                              <AccordionTrigger>Timesheets (manual + CSV import)</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3">
                                  <SectionTitle
                                    title="Manual entries"
                                    description="Use the Timesheet page to record daily time in/out and breaks."
                                  />
                                  <SectionTitle
                                    title="CSV import & validation"
                                    description="Import clock times from the biometric API (date range) or CSV. Earliest punch = Time In, latest = Time Out. Match employees by Personal ID (clock ID)."
                                  />
                                  <BulletList
                                    items={[
                                      <>Upload a CSV and map required columns (Personal ID and Date+Time).</>,
                                      <>The importer aggregates the earliest punch as Time In and the latest as Time Out per employee/day.</>,
                                      <>You can group by employee and see calculated Work Hours before importing.</>,
                                      <>Fix invalid rows (e.g., Time Out must be after Time In) using inline edit.</>,
                                      <>Import will skip invalid rows and import valid entries.</>,
                                    ]}
                                  />
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="admin-payslips">
                              <AccordionTrigger>Payslips (generate, select, export)</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Use <b>Generate / Select Payslip</b> to pick an employee and payslip period for preview/export.</>,
                                    <>Use bulk generation controls to select a period and produce payslips for that window.</>,
                                    <>Bulk exports can generate PDF(s) and may create reports depending on the audit level.</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="admin-payroll-runs">
                              <AccordionTrigger>Payroll Runs & Payment Batches</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Payroll Runs track processing by period (useful for auditing and repeatability).</>,
                                    <>Payment Batches group payments for banking/export workflows.</>,
                                    <>If something looks off: confirm pay-cycle settings, employee assignments, and timesheets for the period.</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="admin-analytics">
                              <AccordionTrigger>Analytics & Reports</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Analytics is intended for management visibility (costs, payroll totals, trends).</>,
                                    <>Reports focus on exports and printable summaries.
                                      </>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="admin-settings">
                              <AccordionTrigger>Settings (Admin-only)</AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-3">
                                  <SectionTitle
                                    title="Work Hours Settings"
                                    description="These settings influence work-hour calculations and lateness/early-departure flags."
                                  />
                                  <BulletList
                                    items={[
                                      <>Daily start/end times (with optional Friday override).</>,
                                      <>Break duration rules (and whether lunch is paid).</>,
                                      <>Work days and overtime thresholds (used in calculations and reporting).</>,
                                    ]}
                                  />
                                  <SectionTitle
                                    title="Company Details"
                                    description="Used for document headers and accurate compliance outputs."
                                  />
                                  <SectionTitle
                                    title="Mock Data Mode"
                                    description="Some features can run with local mock data; live mode reads/writes via Supabase."
                                  />
                                </div>
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="admin-troubleshooting">
                              <AccordionTrigger>Troubleshooting (Admin)</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Buttons not responding: refresh the page; if a menu item is used, try clicking again after the menu closes.</>,
                                    <>No employees/payslips: verify mock mode and that seed data exists, or confirm live DB connectivity.</>,
                                    <>Timesheet import issues: double-check column mapping and fix invalid time rows before import.</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <Card className="rounded-2xl border">
                    <CardHeader>
                      <CardTitle className="text-base">Role & Access</CardTitle>
                      <CardDescription>What Admins/Managers can do.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <BulletList
                        items={[
                          <>Admin: full access (including Settings).</>,
                          <>Manager: operational access (employees, reports, payroll), but not Admin-only settings.</>,
                          <>Staff: restricted to their own data (payslips/timesheets/profile) in the staff portal.</>,
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border">
                    <CardHeader>
                      <CardTitle className="text-base">Best Practices</CardTitle>
                      <CardDescription>Keep payroll output consistent.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <BulletList
                        items={[
                          <>Lock down work-hours rules early and only change them with intent.</>,
                          <>Standardize CSV exports from your clock machine (stable headers and formats).</>,
                          <>Run a quick payslip spot-check before bulk exporting.
                          </>,
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* STAFF */}
            <TabsContent value="staff" className="mt-6">
              <Card className="rounded-2xl border">
                <CardHeader>
                  <CardTitle>Staff User Manual</CardTitle>
                  <CardDescription>
                    For employees using the staff portal to view their own information.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-6">
                      <SectionTitle
                        title="1) What you can access"
                        description="Staff accounts are scoped to your own records. You cannot view other employees." 
                      />
                      <BulletList
                        items={[
                          <>Payslips: view and download your payslip PDFs.</>,
                          <>Timesheets: submit/review time entries (if enabled for your role/build).</>,
                          <>Leave/Vacation: request leave and track status.</>,
                          <>Savings: view/manage your savings plans (if enabled).</>,
                          <>Profile: update personal information.</>,
                        ]}
                      />

                      <Separator />

                      <Accordion type="multiple" className="w-full">
                        <AccordionItem value="staff-payslips">
                          <AccordionTrigger>Payslips</AccordionTrigger>
                          <AccordionContent>
                            <BulletList
                              items={[
                                <>Open the Payslips area to see available payslip periods.</>,
                                <>Select a payslip to preview it.</>,
                                <>Use the actions to print or download the PDF.</>,
                              ]}
                            />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="staff-timesheets">
                          <AccordionTrigger>Timesheets</AccordionTrigger>
                          <AccordionContent>
                            <BulletList
                              items={[
                                <>Record daily time in/out and breaks as instructed by your employer.</>,
                                <>If you see validation errors, correct the times and save.
                                </>,
                              ]}
                            />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="staff-leave">
                          <AccordionTrigger>Leave / Vacation</AccordionTrigger>
                          <AccordionContent>
                            <BulletList
                              items={[
                                <>Submit leave requests with the correct dates and leave type.</>,
                                <>Track approvals and history inside the Leave module.</>,
                              ]}
                            />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="staff-profile">
                          <AccordionTrigger>Profile</AccordionTrigger>
                          <AccordionContent>
                            <BulletList
                              items={[
                                <>Keep your email/contact details accurate.</>,
                                <>If you cannot see your payslips, contact Admin to verify your account is linked to your employee record.</>,
                              ]}
                            />
                          </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="staff-help">
                          <AccordionTrigger>Common issues</AccordionTrigger>
                          <AccordionContent>
                            <BulletList
                              items={[
                                <>Cannot log in: confirm you are using the correct portal (staff vs admin) and credentials.</>,
                                <>No payslips shown: your employer may not have generated the period yet.</>,
                                <>Wrong period: use filters/selection to pick the correct payslip date range.</>,
                              ]}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* DEVELOPER */}
            <TabsContent value="dev" className="mt-6">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <Card className="rounded-2xl border">
                    <CardHeader>
                      <CardTitle>Developer / Maintainer Documentation</CardTitle>
                      <CardDescription>
                        Architecture overview, key flows, and where to change things.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[60vh] pr-4">
                        <div className="space-y-6">
                          <SectionTitle
                            title="1) Tech stack & structure"
                            description="React + TypeScript + React Router, Tailwind CSS, shadcn/ui components, Supabase for auth/data."
                          />
                          <BulletList
                            items={[
                              <>Routes are defined in <code>src/App.tsx</code> with a protected layout.</>,
                              <>Main layout: <code>src/components/MainLayout.tsx</code> and navigation in <code>src/components/Sidebar.tsx</code>.</>,
                              <>Pages live in <code>src/pages/*</code>; reusable UI in <code>src/components/*</code>.</>,
                              <>Supabase client: <code>src/integrations/supabase/client.ts</code> (and integrations under that folder).</>,
                            ]}
                          />

                          <Separator />

                          <Accordion type="multiple" className="w-full">
                            <AccordionItem value="dev-auth">
                              <AccordionTrigger>Authentication & roles</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Auth context is handled in <code>src/context/AuthContext.tsx</code>.</>,
                                    <>Protected routes are enforced via <code>src/components/ProtectedRoute.tsx</code>.</>,
                                    <>Roles (Admin/Manager/Staff) gate routes and sidebar items.</>,
                                    <>Supabase provisioning/roles rely on DB triggers/migrations (see <code>supabase/migrations</code>).</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="dev-mock-live">
                              <AccordionTrigger>Mock vs Live mode</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Some modules can operate in mock mode (local storage / mock datasets).</>,
                                    <>Live mode uses Supabase tables/queries via <code>src/integrations/supabase/*</code> and edge functions under <code>supabase/functions</code>.</>,
                                    <>When debugging: confirm which mode is enabled and whether RLS policies allow the action.</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="dev-timesheets">
                              <AccordionTrigger>Timesheet import flow</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Importer hook: <code>src/hooks/use-timesheet-import.ts</code> parses CSV and aggregates punches.</>,
                                    <>UI: <code>src/components/timesheet/ImportTimesheetDialog.tsx</code> → mapping + validation + table.</>,
                                    <>Preview table: <code>src/components/timesheet/ValidatedDataTable.tsx</code> supports grouping and computed work-hours.</>,
                                    <>Work-hours calculation: <code>src/lib/timesheet-utils.ts</code> (<code>calculateTimesheetMetrics</code>).</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="dev-payslips">
                              <AccordionTrigger>Payslip generation & exports</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>Main UI entry: <code>src/pages/payslips/PayslipOverviewPage.tsx</code>.</>,
                                    <>Generation: <code>src/components/payslips/PayslipGenerationSection.tsx</code>.</>,
                                    <>PDF render: <code>src/components/payslips/PayslipPdfDocument.tsx</code> using <code>@react-pdf/renderer</code>.</>,
                                    <>Bulk ZIP export uses <code>src/hooks/use-zip-download.ts</code>.</>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="dev-troubleshooting">
                              <AccordionTrigger>Troubleshooting & maintenance</AccordionTrigger>
                              <AccordionContent>
                                <BulletList
                                  items={[
                                    <>If UI actions don’t fire inside menus: use Radix <code>onSelect</code> for menu items (not <code>onClick</code>).</>,
                                    <>If dropdowns overlap in tight containers: set placement props (<code>side</code>/<code>align</code>/<code>sideOffset</code>) and avoid viewport breakpoints that don’t match container width.</>,
                                    <>If auth looks stuck: inspect auth state changes and ensure user provisioning exists in the database (RLS + trigger).
                                    </>,
                                  ]}
                                />
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-1 space-y-4">
                  <Card className="rounded-2xl border">
                    <CardHeader>
                      <CardTitle className="text-base">Where to start</CardTitle>
                      <CardDescription>Most common maintenance tasks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <BulletList
                        items={[
                          <>Add routes: <code>src/App.tsx</code>.</>,
                          <>Adjust navigation: <code>src/components/Sidebar.tsx</code>.</>,
                          <>Update timesheet policies/calculation: <code>src/lib/timesheet-utils.ts</code>.</>,
                          <>Update PDF output: <code>src/components/payslips/PayslipPdfDocument.tsx</code>.</>,
                        ]}
                      />
                    </CardContent>
                  </Card>

                  <Card className="rounded-2xl border">
                    <CardHeader>
                      <CardTitle className="text-base">Data safety</CardTitle>
                      <CardDescription>Supabase rules matter.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <BulletList
                        items={[
                          <>All Supabase tables should have RLS enabled and least-privilege policies.</>,
                          <>Be cautious with “public read” policies.</>,
                          <>Prefer edge functions for sensitive server-side logic.</>,
                        ]}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Docs;

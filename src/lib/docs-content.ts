import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Clock,
  CalendarDays,
  ReceiptText,
  ClipboardList,
  Landmark,
  ListTodo,
  LineChart,
  BarChart,
  Settings,
  PiggyBank,
  HandCoins,
  Boxes,
  ShieldCheck,
} from "lucide-react";

export type DocsAudience = "admin" | "staff" | "developer";

export interface DocsQuickLink {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles?: ("Admin" | "Manager" | "Staff")[];
}

export interface DocsBulletSection {
  title: string;
  description?: string;
  items: string[];
}

export interface DocsAccordionSection {
  id: string;
  title: string;
  description?: string;
  bullets?: string[];
  subsections?: DocsBulletSection[];
}

export interface DocsGuide {
  id: DocsAudience;
  title: string;
  subtitle: string;
  intro: string;
  workflowSteps: { step: string; detail: string }[];
  accordions: DocsAccordionSection[];
  sidebarCards: DocsBulletSection[];
}

export const DOCS_WORKFLOW_STEPS = [
  {
    step: "Setup",
    detail: "Company details, pay cycle, tax tables, work hours, and report design.",
  },
  {
    step: "Master data",
    detail: "Employees, compensation components, assignments, and overtime rules.",
  },
  {
    step: "Capture time & leave",
    detail: "Timesheets (Draft → Submitted → Approved) and leave records.",
  },
  {
    step: "Run payroll",
    detail: "Payroll run review, payslip generation, and timesheet lock.",
  },
  {
    step: "Pay & report",
    detail: "Payment batches, registers, statutory exports, and analytics.",
  },
];

export const TIMESHEET_STATUS_GUIDE = [
  {
    status: "Draft",
    meaning: "Work in progress — manual entries start here.",
    payroll: "Not included in pay calculations.",
  },
  {
    status: "Submitted",
    meaning: "Captured or imported — awaiting manager approval.",
    payroll: "Not included until approved.",
  },
  {
    status: "Approved",
    meaning: "Verified hours — cleared for payroll.",
    payroll: "Included in payslip earnings.",
  },
  {
    status: "Locked",
    meaning: "Frozen after payroll — audit record.",
    payroll: "Included if already processed; do not edit.",
  },
];

export const ADMIN_QUICK_LINKS: DocsQuickLink[] = [
  { title: "Dashboard", description: "Operational KPIs and widgets", href: "/dashboard", icon: LayoutDashboard },
  { title: "To-Dos", description: "Action items before payroll", href: "/todos", icon: ListTodo, roles: ["Admin", "Manager"] },
  { title: "Employees", description: "Workforce records", href: "/employees", icon: Users, roles: ["Admin", "Manager"] },
  { title: "Timesheets", description: "Hours and approvals", href: "/timesheet", icon: Clock },
  { title: "Leave", description: "Absence records", href: "/vacation-absence", icon: CalendarDays },
  { title: "Payslips", description: "Register and export", href: "/payslips/overview", icon: ReceiptText },
  { title: "Payroll runs", description: "Period processing", href: "/payroll/runs", icon: ClipboardList, roles: ["Admin", "Manager"] },
  { title: "Analytics", description: "Trends and health", href: "/analytics", icon: LineChart, roles: ["Admin", "Manager"] },
  { title: "Reports", description: "Printable registers", href: "/reports", icon: BarChart, roles: ["Admin", "Manager"] },
  { title: "Settings", description: "Company and tax setup", href: "/settings/company-details", icon: Settings, roles: ["Admin"] },
];

export const STAFF_QUICK_LINKS: DocsQuickLink[] = [
  { title: "Staff portal", description: "Payslips, leave, savings", href: "/staff", icon: Users },
  { title: "My payslips", description: "View and download PDFs", href: "/payslips/overview", icon: ReceiptText },
  { title: "Timesheets", description: "Record your hours", href: "/timesheet", icon: Clock },
  { title: "Leave", description: "Request and track leave", href: "/staff/leave", icon: CalendarDays },
  { title: "Profile", description: "Contact and portal link", href: "/profile", icon: ShieldCheck },
];

export const ADMIN_GUIDE: DocsGuide = {
  id: "admin",
  title: "Administrator guide",
  subtitle: "For owners, payroll admins, and managers running the full system.",
  intro:
    "This payroll system centres on employees, approved timesheets, pay periods, and payslips. Use the Dashboard and To-Dos first each period, then run payroll only when setup, time, and leave data are complete.",
  workflowSteps: DOCS_WORKFLOW_STEPS,
  sidebarCards: [
    {
      title: "Roles & access",
      items: [
        "Admin — full access including Settings and user control.",
        "Manager — employees, payroll runs, analytics, reports; no Settings.",
        "Staff — own payslips, timesheets, leave, and profile in the admin app; or the dedicated /staff portal when deployed.",
      ],
    },
    {
      title: "Before each pay run",
      items: [
        "Clear critical To-Dos (missing employee data, draft timesheets).",
        "Approve timesheets for the pay period.",
        "Record leave that affects the period.",
        "Confirm tax year and pay-cycle settings match the period.",
      ],
    },
  ],
  accordions: [
    {
      id: "dashboard-todos",
      title: "Dashboard & To-Dos",
      description: "Your operational starting point each day.",
      bullets: [
        "Dashboard shows workforce KPIs, setup health, customizable widgets, and period-scoped analytics charts.",
        "To-Dos are generated from gaps in employee data, timesheets, and payroll readiness. Filter by severity and module.",
        "Resolve critical items before running payroll. Marking a field-related to-do done may flag the field as intentionally blank.",
      ],
    },
    {
      id: "employees",
      title: "Employees",
      bullets: [
        "Maintain legal name, ID, tax reference, bank details, pay frequency, and portal access.",
        "Hourly vs salaried employees follow different earnings rules; assignments link components to individuals.",
        "Enable portal access and link a user account so staff can sign in to their own data.",
      ],
    },
    {
      id: "timesheets",
      title: "Timesheets",
      description: "Daily hours feed payroll only when Approved or Locked.",
      subsections: [
        {
          title: "Status workflow",
          items: [
            "Draft — manual entry; editable; not used in pay.",
            "Submitted — still waiting for approval; not used in pay.",
            "Imported clock times are checked in the import window and save as Approved.",
            "Approved — included in payslip calculations.",
            "Locked — set when payroll runs; frozen for audit.",
          ],
        },
        {
          title: "Import",
          items: [
            "Map Personal ID (clock ID) and punch date/time from CSV or biometric API.",
            "Earliest punch = time in, latest = time out per employee per day.",
            "Fix validation errors in the preview before importing valid rows.",
          ],
        },
      ],
    },
    {
      id: "leave",
      title: "Vacation & absence",
      bullets: [
        "Staff submit leave from the employee portal (/staff/leave) as Pending requests with optional documents.",
        "Approve or reject pending requests; edit or delete records when corrections are needed.",
        "Only Approved leave affects payroll balances, timesheets, and unpaid-leave calculations.",
        "Filter by employee, type, status, and date range; pending count appears on the summary cards.",
      ],
    },
    {
      id: "payroll-setup",
      title: "Payroll setup (components, rules, exceptions)",
      bullets: [
        "Components — earning and deduction definitions used across employees.",
        "Assignments — link components to specific employees.",
        "Overtime rules — thresholds and rates for premium pay.",
        "Exceptions dashboard — review calculation anomalies before approving a run.",
      ],
    },
    {
      id: "payroll-runs",
      title: "Payroll runs & payment batches",
      bullets: [
        "Payroll run lifecycle: Draft → Reviewed → Approved → Locked → Paid.",
        "Readiness gates block approval if draft timesheets or missing data exist.",
        "Running payroll generates payslips and locks timesheets in the period.",
        "Payment batches group net-pay lines for banking export workflows.",
      ],
    },
    {
      id: "payslips",
      title: "Payslips",
      bullets: [
        "Payslip register groups by employee with expand/collapse and pagination.",
        "Generate previews for a period, then bulk PDF or ZIP export.",
        "IRP5 / IT3(a) export is available under Payslips when enabled in Tax settings.",
        "Treat payslip data as confidential — register shows totals scoped to filters.",
      ],
    },
    {
      id: "savings-loans",
      title: "Savings & loans",
      bullets: [
        "Savings plans and payroll savings entries track staff deductions and balances.",
        "Loans support balances, manual payments, and pause/resume of payroll deductions.",
        "Both flow into payslip deductions when configured on the employee.",
      ],
    },
    {
      id: "analytics-reports",
      title: "Analytics & reports",
      subsections: [
        {
          title: "Analytics",
          items: [
            "Period-scoped trends: payroll cost, deductions, leave, overtime, tenure.",
            "System health — setup, tasks, timesheets, and data mode.",
            "Database health — connectivity probes to critical Supabase tables (live mode).",
          ],
        },
        {
          title: "Reports",
          items: [
            "Choose monthly or yearly period, then generate from the report library.",
            "Payroll summary supports minimal, standard, or detailed audit levels.",
            "Bank transfer and statutory reports are marked confidential or filing-sensitive.",
            "Customize logo, paper size, and fonts under Settings → Report design.",
          ],
        },
      ],
    },
    {
      id: "settings",
      title: "Settings (Admin only)",
      bullets: [
        "Company details — legal name, addresses, tax references for documents.",
        "Pay cycle — frequency, cut-off, and pay-day offset.",
        "Tax liabilities — PAYE/SDL, tax tables, IRP5 export toggle.",
        "Work hours — start/end times, breaks, work days, overtime thresholds.",
        "User control panel — roles and portal users.",
        "Audit trail — sign-in/out, settings changes, leave actions, payroll events, warnings, and system errors.",
        "Mock data mode — local sample data for training; switch off for live Supabase.",
      ],
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      bullets: [
        "No payslips in period — confirm timesheets are Approved and pay period dates align.",
        "Import failures — verify Personal ID matches employee records and time out is after time in.",
        "Staff cannot see payslips — check portal access and user linkage on the employee record.",
        "Live mode errors — use Analytics database health; confirm Supabase env vars and RLS policies.",
        "Refresh data — use page Refresh buttons or refocus the browser tab to trigger sync.",
      ],
    },
  ],
};

export const STAFF_GUIDE: DocsGuide = {
  id: "staff",
  title: "Staff guide",
  subtitle: "For employees viewing their own payroll information.",
  intro:
    "Staff accounts only see records linked to your employee profile. You cannot access other employees, company-wide analytics, or admin settings.",
  workflowSteps: [
    { step: "Sign in", detail: "Use the staff login or admin app with your Staff role account." },
    { step: "Profile", detail: "Confirm your details and that your account is linked to your employee record." },
    { step: "Timesheets", detail: "Submit accurate hours if your employer requires self-capture." },
    { step: "Payslips", detail: "Download PDFs after payroll has been run for each period." },
    { step: "Leave", detail: "Request leave and track approvals." },
  ],
  sidebarCards: [
    {
      title: "Staff portal (/staff)",
      items: [
        "When deployed as a staff portal, use /staff for payslips, leave, savings, loans, and profile.",
        "Install as PWA or Android app from the install page when offered by your employer.",
      ],
    },
    {
      title: "Need help?",
      items: [
        "Missing payslips usually means payroll has not been run for that period yet.",
        "Contact your payroll administrator to link your login to your employee record.",
      ],
    },
  ],
  accordions: [
    {
      id: "staff-payslips",
      title: "Payslips",
      bullets: [
        "Open Payslips to see periods your employer has processed.",
        "Preview on screen, then print or download the PDF.",
        "Amounts reflect approved timesheets and statutory deductions for that period.",
      ],
    },
    {
      id: "staff-timesheets",
      title: "Timesheets",
      bullets: [
        "Enter time in, time out, and breaks as instructed.",
        "Your entries may start as Draft until a manager approves them.",
        "Only approved hours count toward pay — correct errors before cut-off.",
      ],
    },
    {
      id: "staff-leave",
      title: "Leave",
      bullets: [
        "Submit requests with correct dates and leave type.",
        "Track working days taken and approval status in the leave register.",
      ],
    },
    {
      id: "staff-savings-loans",
      title: "Savings & loans",
      bullets: [
        "View savings plan progress and loan balances if your employer uses these modules.",
        "Deductions appear on payslips when active.",
      ],
    },
    {
      id: "staff-analytics",
      title: "My analytics",
      bullets: [
        "Staff with access to /analytics/staff see personal payslip and leave trends only.",
        "Company-wide analytics and reports are restricted to managers and admins.",
      ],
    },
    {
      id: "staff-issues",
      title: "Common issues",
      bullets: [
        "Cannot log in — verify credentials and whether you should use /staff/login vs the admin login.",
        "Empty payslip list — payroll may not be complete for that month yet.",
        "Wrong amounts — contact payroll admin; do not edit locked employer records yourself.",
      ],
    },
  ],
};

export const DEVELOPER_GUIDE: DocsGuide = {
  id: "developer",
  title: "Developer guide",
  subtitle: "Architecture, extension points, and maintenance notes.",
  intro:
    "React + TypeScript SPA with React Router, Tailwind, shadcn/ui, and Supabase (auth, Postgres, RLS, edge functions). Payroll logic lives in src/lib/payroll-calculations and hooks under src/hooks.",
  workflowSteps: [
    { step: "Routes", detail: "src/App.tsx — admin vs staff portal via VITE_PORTAL." },
    { step: "Data", detail: "PayrollDataContext + usePayrollProcessor aggregate hooks." },
    { step: "Calc", detail: "payslip-generator.ts uses Approved/Locked timesheets only." },
    { step: "DB", detail: "supabase/migrations + integrations/supabase queries." },
    { step: "PDF", detail: "Payslips use @react-pdf/renderer; catalog reports use Chromium HTML→PDF (Playwright in local, @sparticuz/chromium on Vercel)." },
  ],
  sidebarCards: [
    {
      title: "Key paths",
      items: [
        "Navigation — src/components/Sidebar.tsx",
        "Admin summaries — src/lib/*-admin-summary.ts",
        "Report generators — src/lib/report-generators/",
        "Timesheet import — src/hooks/use-timesheet-import.ts",
      ],
    },
    {
      title: "Data safety",
      items: [
        "Enable RLS on all public tables; least-privilege policies per role.",
        "Never commit .env or service role keys.",
        "Use edge functions for privileged operations (bootstrap, reminders).",
      ],
    },
  ],
  accordions: [
    {
      id: "dev-auth",
      title: "Auth & roles",
      bullets: [
        "AuthContext — session and role (Admin | Manager | Staff).",
        "ProtectedRoute — allowedRoles per route group in App.tsx.",
        "Users profile trigger — supabase/migrations for auth.users → public.users.",
      ],
    },
    {
      id: "dev-mock",
      title: "Mock vs live",
      bullets: [
        "Mock mode — localStorage datasets via PayrollDataContext flags.",
        "Live mode — Supabase queries; isSupabaseEnvConfigured() gates deployment.",
        "To-Dos generation calls edge function in live mode.",
      ],
    },
    {
      id: "dev-payroll",
      title: "Payroll pipeline",
      bullets: [
        "use-payroll-processing-logic.ts — runPayrollProcess, locks timesheets.",
        "use-readiness-gates.ts — blocks run approval on draft timesheets.",
        "payroll-run-queries.ts — run status transitions and snapshots.",
      ],
    },
    {
      id: "dev-ui-patterns",
      title: "Admin UI patterns",
      bullets: [
        "kan-page-banner headers, filter-scoped KPIs, ErrorBoundary on tables.",
        "build*AdminSummary helpers + vitest in src/lib/*.test.ts.",
        "DashboardPeriodFilterBar shared chart period type (3m/6m/12m/all).",
      ],
    },
    {
      id: "dev-troubleshooting",
      title: "Maintenance tips",
      bullets: [
        "Radix menus — prefer onSelect over onClick for menu items.",
        "Report PDFs — Chromium renders the same HTML as the report preview (not the legacy HtmlReportPdfDocument parser).",
        "Month keys — use yyyy-MM (7 chars) when slicing pay period strings.",
      ],
    },
  ],
};

export function getDefaultDocsAudience(role?: string): DocsAudience {
  if (role === "Staff") return "staff";
  return "admin";
}

export function filterQuickLinks(links: DocsQuickLink[], role?: string) {
  if (!role) return links;
  return links.filter((l) => !l.roles || l.roles.includes(role as "Admin" | "Manager" | "Staff"));
}

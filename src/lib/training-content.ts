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
  Smartphone,
} from "lucide-react";

export type TrainingRole = "Admin" | "Manager" | "Staff";

export interface TrainingProcedure {
  title: string;
  steps: string[];
}

export interface TrainingManual {
  id: string;
  title: string;
  description: string;
  category: "Administration" | "Payroll" | "People" | "Staff self-service";
  audience: TrainingRole[];
  href: string;
  icon: LucideIcon;
  estimatedMinutes: number;
  objectives: string[];
  beforeYouStart: string[];
  procedures: TrainingProcedure[];
  commonMistakes: string[];
  practiceExercise: string;
}

export const ADMIN_TRAINING_MANUALS: TrainingManual[] = [
  {
    id: "dashboard-todos",
    title: "Dashboard & To-Dos",
    description: "Start each pay period from the dashboard and clear readiness tasks before payroll.",
    category: "Administration",
    audience: ["Admin", "Manager"],
    href: "/dashboard",
    icon: LayoutDashboard,
    estimatedMinutes: 20,
    objectives: [
      "Read dashboard KPIs and setup health at a glance.",
      "Use To-Dos to find blockers before payroll.",
      "Filter tasks by severity and module.",
      "Know when a to-do can be marked done vs when data must be fixed.",
    ],
    beforeYouStart: [
      "Sign in with Admin or Manager role.",
      "Confirm you are in live mode (not mock data) for production training.",
      "Note the current pay period dates from Settings → Pay cycle.",
    ],
    procedures: [
      {
        title: "Review the dashboard each morning",
        steps: [
          "Open Dashboard from the sidebar.",
          "Check summary cards: headcount, timesheet status, loans, and period totals.",
          "Open Setup health if shown — resolve any critical setup gaps first.",
          "Use the pay-period filter on charts to match the period you are processing.",
        ],
      },
      {
        title: "Work through To-Dos",
        steps: [
          "Open To-Dos from the sidebar (badge shows pending count).",
          "Filter by severity: clear Critical items before Warning items.",
          "Filter by module (Employees, Timesheet, Payslips, etc.) to batch similar work.",
          "Click a to-do message — use the module link or navigate manually to fix the underlying issue.",
          "For employee field gaps: fix the employee record, then mark the to-do done if appropriate.",
          "Re-open To-Dos after fixes — pending count should drop. Admins can trigger a refresh from the app.",
        ],
      },
      {
        title: "Jump to payroll runs from the dashboard",
        steps: [
          "On Dashboard, use primary actions or Payroll Runs shortcut when the period is ready.",
          "The selected pay period can carry through to Payroll Runs — verify dates before creating a run.",
        ],
      },
    ],
    commonMistakes: [
      "Ignoring Critical to-dos and running payroll anyway — causes wrong or missing payslips.",
      "Marking a to-do done without fixing the employee record — the task may return on next refresh.",
      "Mixing mock data training with live payroll — always confirm data mode before a real run.",
    ],
    practiceExercise:
      "Open To-Dos, filter to Timesheet module, and list what would block payroll if left unresolved. Fix one item or document why it is acceptable.",
  },
  {
    id: "employees",
    title: "Employees",
    description: "Create and maintain employee master data, bank details, and portal access.",
    category: "People",
    audience: ["Admin", "Manager"],
    href: "/employees",
    icon: Users,
    estimatedMinutes: 35,
    objectives: [
      "Add a new employee with complete payroll fields.",
      "Distinguish hourly vs salaried pay setup.",
      "Enable staff portal access and link a login.",
      "Send welcome notifications when templates are configured.",
    ],
    beforeYouStart: [
      "Have ID number, tax reference, bank details, start date, and job title ready.",
      "Know whether the employee is hourly or salaried and their pay frequency.",
    ],
    procedures: [
      {
        title: "Add a new employee",
        steps: [
          "Go to Employees → Add employee (or open the employee form).",
          "Complete Personal details: legal name, ID, contact, address.",
          "Enter Employment: job title, start date, pay type (hourly/salary), pay frequency.",
          "Enter Tax & banking: tax reference, bank name, account number, branch code.",
          "Set Personal ID (clock-in ID) if timesheets use biometric or CSV import — must match import file.",
          "Save the record and confirm the employee appears in the list.",
        ],
      },
      {
        title: "Enable portal access",
        steps: [
          "Edit the employee → Portal / access section.",
          "Enable portal access and link an existing user or invite by email.",
          "Staff sign in at /staff/login (portal) or the main app with Staff role.",
          "Optionally send welcome email/SMS from the employee form when notification templates are enabled.",
        ],
      },
      {
        title: "Update or deactivate",
        steps: [
          "Search or filter the employee list to find the record.",
          "Edit fields — changes apply from the next payroll run unless noted on the form.",
          "Do not delete employees with payslip history unless your policy allows — prefer end-date or inactive handling per your process.",
        ],
      },
    ],
    commonMistakes: [
      "Missing Personal ID — biometric/CSV timesheet import will fail to match punches.",
      "Wrong pay type — hourly employees need approved timesheets; salaried may use fixed earnings.",
      "Portal enabled but no user linked — staff cannot sign in to view payslips.",
    ],
    practiceExercise:
      "Create a test employee in mock mode (or review an existing record) and verify every field required for payslip generation is populated.",
  },
  {
    id: "timesheets",
    title: "Timesheets",
    description: "Capture hours, import clock data, and approve time for payroll.",
    category: "People",
    audience: ["Admin", "Manager"],
    href: "/timesheet",
    icon: Clock,
    estimatedMinutes: 40,
    objectives: [
      "Understand Draft → Submitted → Approved → Locked workflow.",
      "Enter or import daily hours correctly.",
      "Approve timesheets for the pay period before payroll.",
    ],
    beforeYouStart: [
      "Confirm pay period start and end dates.",
      "For import: CSV or biometric file with Personal ID and punch times.",
      "Only Approved (or Locked) hours are included in payslip calculations.",
    ],
    procedures: [
      {
        title: "Manual daily entry",
        steps: [
          "Open Timesheet from the sidebar.",
          "Select employee and date.",
          "Enter time in, time out, and break minutes as per company policy.",
          "Save — entry starts as Draft until submitted/approved per your workflow.",
          "Repeat for each day in the pay period.",
        ],
      },
      {
        title: "Import from CSV or biometric",
        steps: [
          "Open Timesheet → Import section.",
          "Upload file or connect biometric API if configured.",
          "Map columns: Personal ID, date, time in, time out.",
          "Review validation preview — fix rows with errors (unknown ID, missing clock-out, etc.).",
          "Import valid rows. The import preview is the check, so those rows save as Approved.",
          "Choose Import and start payroll run to open a draft run for that date range.",
        ],
      },
      {
        title: "Approve for payroll",
        steps: [
          "On the payroll run, use Lock all timesheets. The hours were already checked at import.",
          "Generate the run after the lock. Payslips use Approved and Locked hours.",
          "After payroll runs, affected timesheets stay Locked — do not edit locked rows.",
        ],
      },
    ],
    commonMistakes: [
      "Running payroll while timesheets are still Draft or Submitted — those hours are excluded.",
      "Personal ID mismatch — import creates orphan or failed rows.",
      "Editing locked timesheets after payroll — breaks audit trail; use corrections process instead.",
    ],
    practiceExercise:
      "For one employee, walk one week: create or import entries, move to Approved, and confirm they would appear in a payslip preview for that period.",
  },
  {
    id: "leave",
    title: "Vacation & Absence",
    description: "Manage leave requests, approvals, and payroll impact.",
    category: "People",
    audience: ["Admin", "Manager"],
    href: "/vacation-absence",
    icon: CalendarDays,
    estimatedMinutes: 25,
    objectives: [
      "Approve or reject staff leave requests.",
      "Record admin leave entries when needed.",
      "Understand which leave statuses affect payroll.",
    ],
    beforeYouStart: [
      "Know leave types your company uses (annual, sick, unpaid, etc.).",
      "Staff requests appear as Pending until you act.",
    ],
    procedures: [
      {
        title: "Approve a staff request",
        steps: [
          "Open Vacation & Absence.",
          "Filter by status Pending to see new requests.",
          "Open the record — check dates, type, and attached documents if any.",
          "Approve or Reject with a clear reason for rejections.",
          "Approved leave is used in payroll and leave balance calculations.",
        ],
      },
      {
        title: "Record leave as administrator",
        steps: [
          "Click Add leave record.",
          "Select employee, type, start and end dates.",
          "Set status to Approved when the absence is confirmed.",
          "Save — verify on the calendar and summary cards.",
        ],
      },
      {
        title: "Correct a mistake",
        steps: [
          "Find the leave record via filters.",
          "Edit dates or type, or delete if created in error and payroll has not used it.",
          "If payroll already ran for that period, coordinate a correction run with your payroll policy.",
        ],
      },
    ],
    commonMistakes: [
      "Leaving requests Pending — employee sees no decision; payroll may not reflect absence.",
      "Overlapping leave and timesheet hours for the same day — reconcile before pay run.",
      "Unpaid leave not recorded — employee may be overpaid.",
    ],
    practiceExercise:
      "Filter pending leave (if any), approve one request, and confirm the summary card pending count decreases.",
  },
  {
    id: "payroll-setup",
    title: "Payroll Setup",
    description: "Components, assignments, overtime rules, and exceptions.",
    category: "Payroll",
    audience: ["Admin", "Manager"],
    href: "/payroll/components",
    icon: Boxes,
    estimatedMinutes: 45,
    objectives: [
      "Define earning and deduction components.",
      "Assign components to employees.",
      "Configure overtime premium rules.",
      "Review the exceptions dashboard before approving a run.",
    ],
    beforeYouStart: [
      "Company pay policies documented (allowances, deductions, OT thresholds).",
      "Tax tables and pay cycle configured under Settings.",
    ],
    procedures: [
      {
        title: "Create a compensation component",
        steps: [
          "Go to Payroll setup → Components.",
          "Add earning or deduction: name, amount or percent, taxable/pre-tax flags, effective dates.",
          "Save — component is available for assignment.",
        ],
      },
      {
        title: "Assign to an employee",
        steps: [
          "Open Assignments.",
          "Select employee and component; set override amount if needed.",
          "Set effective start/end dates for temporary allowances.",
          "Save — assignment applies on the next payslip generation for matching periods.",
        ],
      },
      {
        title: "Overtime rules",
        steps: [
          "Open Overtime Rules.",
          "Set weekly thresholds and premium rates (e.g. 1.5×, 2×) per policy.",
          "Ensure Work hours settings align (Settings → Work hours).",
        ],
      },
      {
        title: "Exceptions dashboard",
        steps: [
          "Before finalising a payroll run, open Exceptions.",
          "Review anomalies (missing data, unusual amounts).",
          "Fix root cause on employee, timesheet, or assignment records.",
        ],
      },
    ],
    commonMistakes: [
      "Component created but not assigned — no effect on payslips.",
      "Overlapping assignment dates causing duplicate deductions.",
      "Skipping exceptions review — errors reach the bank file or payslips.",
    ],
    practiceExercise:
      "Locate one active assignment and trace which component and employee it affects; confirm it appears on a payslip preview.",
  },
  {
    id: "payroll-runs",
    title: "Payroll Runs & Payment Batches",
    description: "Process a pay period from run creation through bank export.",
    category: "Payroll",
    audience: ["Admin", "Manager"],
    href: "/payroll/runs",
    icon: ClipboardList,
    estimatedMinutes: 50,
    objectives: [
      "Create a payroll run for the correct period.",
      "Move a run through review and approval gates.",
      "Generate payslips and lock timesheets.",
      "Build a payment batch and export bank file.",
    ],
    beforeYouStart: [
      "To-Dos critical items cleared.",
      "Timesheets Approved for the period.",
      "Tax tables ready (Settings → Tax liabilities).",
    ],
    procedures: [
      {
        title: "Create a payroll run",
        steps: [
          "Open Payroll Runs.",
          "Set period start and end to match your pay cycle (dashboard may pre-fill).",
          "Create run — you are taken to the run detail page.",
          "Status starts as Draft.",
        ],
      },
      {
        title: "Review and approve",
        steps: [
          "On run detail, review employee lines, earnings, deductions, and readiness warnings.",
          "Resolve readiness gates (e.g. draft timesheets) shown on the page.",
          "Move status through Reviewed → Approved when satisfied.",
          "Run payroll / generate payslips for the period — timesheets in range become Locked.",
        ],
      },
      {
        title: "Payment batch",
        steps: [
          "Open Payment Batches → create batch linked to the paid run or period.",
          "Review net pay lines per employee.",
          "Export Bankserv ACB or CSV per your bank process.",
          "Validate file in bank upload sandbox before live submission.",
          "Mark batch Paid when disbursement is confirmed.",
        ],
      },
      {
        title: "Void or correct (if needed)",
        steps: [
          "Use void workflow on the run only per company policy — understand impact on payslips and locked timesheets.",
          "Re-run after corrections; never duplicate pay for the same period.",
        ],
      },
    ],
    commonMistakes: [
      "Wrong period dates — payslips generated for incorrect week/month.",
      "Approving with unapproved timesheets — missing pay or wrong hours.",
      "Bank file totals not reconciled to payslip register before upload.",
    ],
    practiceExercise:
      "In mock mode, create a run for the current cycle, step through review screens, and list each readiness check the system shows.",
  },
  {
    id: "payslips",
    title: "Payslips",
    description: "Register, preview, PDF export, and statutory certificates.",
    category: "Payroll",
    audience: ["Admin", "Manager"],
    href: "/payslips/overview",
    icon: ReceiptText,
    estimatedMinutes: 30,
    objectives: [
      "Navigate the payslip register and filters.",
      "Generate previews and bulk PDFs.",
      "Send notifications when configured.",
      "Export IRP5 where enabled.",
    ],
    beforeYouStart: [
      "Payroll run completed for the target period.",
      "Payslip design configured under Settings if branding is required.",
    ],
    procedures: [
      {
        title: "Find payslips for a period",
        steps: [
          "Open Payslips → Overview.",
          "Filter by pay period, employee, or department as available.",
          "Expand rows to see earnings and deductions breakdown.",
        ],
      },
      {
        title: "Generate and distribute",
        steps: [
          "Use generation actions for the selected period (preview first).",
          "Bulk PDF or ZIP for archive or email distribution.",
          "If email/SMS notifications are on, trigger payslip alerts per notification settings.",
          "Staff can download their own copies from /staff or Payslips when portal is enabled.",
        ],
      },
      {
        title: "IRP5 / tax certificates",
        steps: [
          "Open IRP5 export under Payslips when enabled in Tax settings.",
          "Select tax year and employees.",
          "Review validation warnings before filing.",
        ],
      },
    ],
    commonMistakes: [
      "Distributing PDFs before payroll run is final — amounts may change.",
      "Wrong period filter — staff receive incorrect month.",
      "Skipping PAYE breakdown review for queries from employees.",
    ],
    practiceExercise:
      "Filter payslips to last completed period and open one employee PDF; identify gross, deductions, and net pay lines.",
  },
  {
    id: "savings-loans",
    title: "Savings & Loans",
    description: "Administer deductions, balances, and loan recovery.",
    category: "Payroll",
    audience: ["Admin", "Manager"],
    href: "/loans-advancements",
    icon: HandCoins,
    estimatedMinutes: 30,
    objectives: [
      "Create a loan and set repayment schedule.",
      "Pause or resume deductions.",
      "Record manual payments.",
      "Manage savings plans and payroll savings entries.",
    ],
    beforeYouStart: [
      "Employee record exists.",
      "Loan amount, repayment amount, frequency, and start date agreed.",
      "Note: loans are admin-created — there is no staff loan application workflow.",
    ],
    procedures: [
      {
        title: "Create a loan",
        steps: [
          "Open Loans & Advancements.",
          "Add loan: select employee, type, amount, repayment amount, frequency, start date.",
          "Save — loan is active immediately; deductions apply on payroll from the start date.",
        ],
      },
      {
        title: "Pause or manual payment",
        steps: [
          "Open the loan card → Pause deductions if recovery must stop temporarily.",
          "Resume when ready — paused loans may appear on To-Dos for review.",
          "Record manual payment for off-payroll collections; balance updates accordingly.",
        ],
      },
      {
        title: "Savings",
        steps: [
          "Open Savings → create or edit saving plan per employee.",
          "Track payroll savings entries linked to runs.",
          "Confirm deductions on payslip preview.",
        ],
      },
    ],
    commonMistakes: [
      "Expecting a loan approval step — creating the loan is the approval.",
      "Forgotten pause — payroll keeps deducting after agreement to stop.",
      "Manual payment not recorded — balance disagrees with employee records.",
    ],
    practiceExercise:
      "Review one active loan: note remaining balance, repayment amount, and whether it is paused.",
  },
  {
    id: "analytics-reports",
    title: "Analytics & Reports",
    description: "Trends, system health, and statutory reporting.",
    category: "Administration",
    audience: ["Admin", "Manager"],
    href: "/analytics",
    icon: LineChart,
    estimatedMinutes: 35,
    objectives: [
      "Use analytics for period trends and workforce metrics.",
      "Check system and database health.",
      "Generate core payroll and statutory reports.",
    ],
    beforeYouStart: [
      "Select the same period you use for payroll decisions.",
      "Reports may contain confidential payroll data — handle per POPIA policy.",
    ],
    procedures: [
      {
        title: "Analytics overview",
        steps: [
          "Open Analytics.",
          "Set period filter (3m / 6m / 12m / all) consistently across charts.",
          "Review payroll cost, deductions, leave, and setup health widgets.",
          "Use database health (live mode) if features behave unexpectedly.",
        ],
      },
      {
        title: "Generate a report",
        steps: [
          "Open Reports.",
          "Choose monthly or yearly period.",
          "Select report type: payroll summary, tax statutory, bank transfer, etc.",
          "Pick detail level (minimal / standard / detailed) where offered.",
          "Generate PDF — verify totals against payslip register before external use.",
        ],
      },
      {
        title: "EMP201 and filing",
        steps: [
          "Generate EMP201 for the filing month after payslips are final.",
          "Reconcile to payslip PAYE/SDL totals.",
          "Export Easyfile or other formats as your process requires.",
        ],
      },
    ],
    commonMistakes: [
      "Report period ≠ payslip period — filing mismatches.",
      "Using draft payroll data in statutory exports.",
      "Sharing reports without access controls.",
    ],
    practiceExercise:
      "Generate a payroll summary for the last closed month and compare total net pay to the payment batch total.",
  },
  {
    id: "settings",
    title: "Settings",
    description: "Company, tax, pay cycle, users, and audit — Admin only.",
    category: "Administration",
    audience: ["Admin"],
    href: "/settings/company-details",
    icon: Settings,
    estimatedMinutes: 45,
    objectives: [
      "Maintain company and branding details.",
      "Configure pay cycle and work hours.",
      "Manage tax tables and notification templates.",
      "Administer users and review audit trail.",
    ],
    beforeYouStart: [
      "Admin role required — managers cannot access Settings.",
      "Changes may affect all future payroll runs.",
    ],
    procedures: [
      {
        title: "Company and pay cycle",
        steps: [
          "Settings → Company details: legal name, addresses, logo.",
          "Pay cycle: weekly/monthly, cut-off, pay day.",
          "Work hours: standard day, breaks, overtime thresholds.",
        ],
      },
      {
        title: "Tax and compliance",
        steps: [
          "Tax liabilities: active tax year, PAYE/SDL, import or refresh SARS tables.",
          "Enable IRP5 export if required.",
          "POPIA tools: consent, data access requests, processing register.",
        ],
      },
      {
        title: "Users and audit",
        steps: [
          "User control panel: create users, assign Admin / Manager / Staff roles.",
          "Message templates and notifications: email/SMS sender, payslip and welcome templates.",
          "Audit trail: review sign-ins, settings changes, payroll events.",
        ],
      },
    ],
    commonMistakes: [
      "Wrong tax year — PAYE calculated incorrectly for entire period.",
      "Mock data left on in production.",
      "Shared Admin passwords — use individual accounts for auditability.",
    ],
    practiceExercise:
      "Walk Settings menu and list which sections you would update at year-end vs monthly.",
  },
];

export const STAFF_TRAINING_MANUALS: TrainingManual[] = [
  {
    id: "staff-getting-started",
    title: "Getting Started (Staff Portal)",
    description: "Sign in, navigate the portal, and know where to get help.",
    category: "Staff self-service",
    audience: ["Staff"],
    href: "/staff",
    icon: Smartphone,
    estimatedMinutes: 15,
    objectives: [
      "Sign in to the staff portal or staff app.",
      "Find payslips, leave, savings, loans, and profile.",
      "Know when to contact payroll admin.",
    ],
    beforeYouStart: [
      "Your employer must link your login to your employee record.",
      "Use the URL or app your employer provided (/staff/login or staff APK).",
    ],
    procedures: [
      {
        title: "First sign-in",
        steps: [
          "Open staff login page — not the admin login unless instructed.",
          "Enter email and password from your welcome message.",
          "Land on Staff home — use bottom or side navigation for modules.",
          "Open Profile to confirm your name and employee details match.",
        ],
      },
      {
        title: "Install mobile app (if offered)",
        steps: [
          "Open /staff/install from your employer's link.",
          "Follow install steps for Android APK or add to home screen (PWA).",
          "Sign in again in the app — same credentials.",
        ],
      },
    ],
    commonMistakes: [
      "Using admin login URL — Staff role may not see the same menus.",
      "Empty payslips — payroll may not be run yet; wait for pay date.",
      "Editing employer-controlled fields in profile — some details are read-only.",
    ],
    practiceExercise:
      "Sign in and open each menu item once; note which screens show your data vs empty state.",
  },
  {
    id: "staff-payslips",
    title: "My Payslips",
    description: "View and download your payslip PDFs.",
    category: "Staff self-service",
    audience: ["Staff"],
    href: "/staff/payslips",
    icon: ReceiptText,
    estimatedMinutes: 10,
    objectives: [
      "Find payslips by period.",
      "Download or share PDF securely.",
      "Understand gross, deductions, and net pay.",
    ],
    beforeYouStart: [
      "Payslips appear only after employer runs payroll for that period.",
    ],
    procedures: [
      {
        title: "View a payslip",
        steps: [
          "Open Payslips from staff navigation.",
          "Select the pay period from the list.",
          "Preview on screen — check gross earnings and deductions.",
          "Download PDF for your records or loan applications.",
        ],
      },
    ],
    commonMistakes: [
      "Expecting current month before pay day — list updates after payroll.",
      "Sharing PDFs on public channels — contains personal and salary data.",
    ],
    practiceExercise:
      "Download your latest payslip and identify one deduction line you do not understand — note it for your payroll admin.",
  },
  {
    id: "staff-timesheets",
    title: "My Timesheets",
    description: "Record hours when your employer requires self-capture.",
    category: "Staff self-service",
    audience: ["Staff"],
    href: "/timesheet",
    icon: Clock,
    estimatedMinutes: 20,
    objectives: [
      "Enter daily time in, time out, and breaks.",
      "Understand Draft vs Approved status.",
      "Submit before payroll cut-off.",
    ],
    beforeYouStart: [
      "Confirm with your manager whether you self-capture or use clocking only.",
    ],
    procedures: [
      {
        title: "Enter a day",
        steps: [
          "Open Timesheet.",
          "Select today's date (or the day you are correcting).",
          "Enter time in and time out per company rules.",
          "Include break minutes if required.",
          "Save — status may show Draft until manager approves.",
        ],
      },
      {
        title: "Fix an error",
        steps: [
          "Open the day while still Draft or Submitted.",
          "Correct times and save.",
          "If status is Locked, contact payroll — you cannot edit after payroll.",
        ],
      },
    ],
    commonMistakes: [
      "Missing clock-out — day may be rejected on import or approval.",
      "Late entry after payroll — hours miss that pay period.",
    ],
    practiceExercise:
      "Enter yesterday's hours (or review an existing row) and state what status it must reach before pay.",
  },
  {
    id: "staff-leave",
    title: "My Leave",
    description: "Request leave and track approval status.",
    category: "Staff self-service",
    audience: ["Staff"],
    href: "/staff/leave",
    icon: CalendarDays,
    estimatedMinutes: 15,
    objectives: [
      "Submit a leave request with correct dates and type.",
      "Track Pending vs Approved status.",
      "Attach documents when required.",
    ],
    beforeYouStart: [
      "Know your leave balance policy — system shows records your employer maintains.",
    ],
    procedures: [
      {
        title: "Request leave",
        steps: [
          "Open Leave from staff navigation.",
          "New request: choose leave type, start and end dates.",
          "Add notes or upload document if required (e.g. sick note).",
          "Submit — status is Pending until manager acts.",
        ],
      },
      {
        title: "Follow up",
        steps: [
          "Check list for Approved or Rejected.",
          "If still Pending near your leave date, contact your manager.",
          "Do not assume approval until status shows Approved.",
        ],
      },
    ],
    commonMistakes: [
      "Wrong dates — partial days may need separate handling per policy.",
      "Unapproved leave taken — may affect pay as unpaid absence.",
    ],
    practiceExercise:
      "Submit a test request in a training environment, or trace the status of your latest real request.",
  },
  {
    id: "staff-savings-loans",
    title: "My Savings & Loans",
    description: "View balances and deduction history.",
    category: "Staff self-service",
    audience: ["Staff"],
    href: "/staff/savings",
    icon: PiggyBank,
    estimatedMinutes: 10,
    objectives: [
      "View savings plan progress.",
      "View loan balance and status.",
      "See deductions on payslips.",
    ],
    beforeYouStart: [
      "Not all employers use these modules — empty screens may be normal.",
    ],
    procedures: [
      {
        title: "Review savings and loans",
        steps: [
          "Open Savings or Loans from staff navigation.",
          "Review active plans — balance, instalment, status.",
          "Cross-check with payslip deduction lines each month.",
          "For loan queries or early settlement, contact payroll admin — you cannot create loans yourself.",
        ],
      },
    ],
    commonMistakes: [
      "Expecting to apply for a loan in the app — loans are created by payroll admin.",
      "Balance mismatch — ask admin to record manual payments or corrections.",
    ],
    practiceExercise:
      "Compare one loan balance on the loans screen with the deduction on your latest payslip.",
  },
  {
    id: "staff-profile",
    title: "My Profile & Privacy",
    description: "Contact details and privacy information.",
    category: "Staff self-service",
    audience: ["Staff"],
    href: "/staff/profile",
    icon: ShieldCheck,
    estimatedMinutes: 10,
    objectives: [
      "Update contact details where allowed.",
      "Understand privacy and data rights.",
    ],
    beforeYouStart: [
      "Bank and tax changes may require HR verification — not all fields are editable.",
    ],
    procedures: [
      {
        title: "Update profile",
        steps: [
          "Open Profile from staff navigation.",
          "Edit phone or email if the form allows.",
          "Save — some changes may need employer approval.",
          "Open Privacy page for POPIA-related information your employer provides.",
        ],
      },
    ],
    commonMistakes: [
      "Changing bank details without telling HR — pay may go to old account until verified.",
    ],
    practiceExercise:
      "Confirm your mobile number on profile matches what payroll has for SMS payslip alerts.",
  },
];

export const ALL_TRAINING_MANUALS: TrainingManual[] = [
  ...ADMIN_TRAINING_MANUALS,
  ...STAFF_TRAINING_MANUALS,
];

export function filterTrainingManuals(
  manuals: TrainingManual[],
  role?: string
): TrainingManual[] {
  if (!role) return manuals;
  if (role === "Staff") {
    return manuals.filter((m) => m.audience.includes("Staff"));
  }
  if (role === "Manager") {
    return manuals.filter(
      (m) => m.audience.includes("Manager") || m.audience.includes("Staff")
    );
  }
  if (role === "Admin") {
    return manuals;
  }
  return manuals;
}

export function getTrainingCategories(manuals: TrainingManual[]): string[] {
  return Array.from(new Set(manuals.map((m) => m.category))).sort();
}

export function getTrainingManualById(
  id: string,
  manuals: TrainingManual[] = ALL_TRAINING_MANUALS
): TrainingManual | undefined {
  return manuals.find((m) => m.id === id);
}

export function getDefaultTrainingManualId(role?: string): string {
  if (role === "Staff") return "staff-getting-started";
  return "dashboard-todos";
}

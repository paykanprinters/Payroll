"use client";

import React from "react";
import { cn } from "@/lib/utils";

/** Hand-sketch palette — matches Docs cyan accent */
const INK = "#0e7490";
const INK_LIGHT = "#67e8f9";
const INK_FILL = "#ecfeff";
const MUTED = "#94a3b8";
const ACCENT = "#f59e0b";

type DoodleProps = { className?: string };

function SketchSvg({ children, className, viewBox = "0 0 480 140" }: DoodleProps & { children: React.ReactNode; viewBox?: string }) {
  return (
    <svg
      viewBox={viewBox}
      className={cn("w-full max-w-xl text-cyan-900", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
    >
      <rect x="1" y="1" width="478" height="138" rx="12" fill={INK_FILL} stroke={INK_LIGHT} strokeWidth="1.5" strokeDasharray="4 3" />
      {children}
    </svg>
  );
}

function Box({
  x,
  y,
  w,
  h,
  label,
  highlight,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="8"
        fill="white"
        stroke={highlight ? INK : MUTED}
        strokeWidth={highlight ? 2.2 : 1.8}
        strokeLinecap="round"
      />
      <text
        x={x + w / 2}
        y={y + h / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
        fontWeight={highlight ? "600" : "500"}
        fill={highlight ? INK : "#475569"}
      >
        {label}
      </text>
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g stroke={INK} strokeWidth="2" strokeLinecap="round">
      <path d={`M${x1} ${y1} C ${(x1 + x2) / 2} ${y1 - 6}, ${(x1 + x2) / 2} ${y2 + 6}, ${x2} ${y2}`} />
      <path d={`M${x2 - 8} ${y2 - 4} L ${x2} ${y2} L ${x2 - 8} ${y2 + 4}`} fill={INK} stroke="none" />
    </g>
  );
}

function FlowDoodle({ steps, caption }: { steps: string[]; caption: string }) {
  const n = steps.length;
  const boxW = Math.min(72, (420 - (n - 1) * 28) / n);
  const gap = 28;
  const totalW = n * boxW + (n - 1) * gap;
  const startX = (480 - totalW) / 2;
  const y = 44;
  const h = 36;

  return (
    <SketchSvg>
      {steps.map((label, i) => {
        const x = startX + i * (boxW + gap);
        return (
          <React.Fragment key={label}>
            {i > 0 && <Arrow x1={x - gap + 4} y1={y + h / 2} x2={x - 4} y2={y + h / 2} />}
            <Box x={x} y={y} w={boxW} h={h} label={label} highlight={i === n - 1} />
          </React.Fragment>
        );
      })}
      <text x="240" y="118" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui, sans-serif">
        {caption}
      </text>
    </SketchSvg>
  );
}

function DashboardDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 150">
      <rect x="24" y="28" width="140" height="88" rx="10" fill="white" stroke={INK} strokeWidth="2" />
      <rect x="36" y="40" width="50" height="28" rx="4" fill={INK_FILL} stroke={INK_LIGHT} strokeWidth="1.5" />
      <rect x="94" y="40" width="58" height="28" rx="4" fill={INK_FILL} stroke={INK_LIGHT} strokeWidth="1.5" />
      <path d="M36 82 H148" stroke={MUTED} strokeWidth="1.5" strokeDasharray="3 2" />
      <path d="M36 92 H120" stroke={MUTED} strokeWidth="1.5" strokeDasharray="3 2" />
      <text x="94" y="58" textAnchor="middle" fontSize="9" fill={INK} fontFamily="system-ui">KPIs</text>
      <Arrow x1={168} y1={72} x2={198} y2={72} />
      <rect x="200" y="36" width="120" height="72" rx="10" fill="white" stroke={ACCENT} strokeWidth="2" />
      <path d="M216 52 h16 M216 62 h24 M216 72 h20 M216 82 h28" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <circle cx="298" cy="52" r="10" stroke={ACCENT} strokeWidth="2" fill="none" />
      <path d="M294 52 l3 3 6-6" stroke={ACCENT} strokeWidth="1.5" strokeLinecap="round" />
      <text x="260" y="108" textAnchor="middle" fontSize="10" fill="#475569" fontFamily="system-ui">
        Fix to-dos → payroll ready
      </text>
      <Box x={340} y={48} w={110} h={40} label="Payroll" highlight />
      <Arrow x1={322} y1={68} x2={338} y2={68} />
    </SketchSvg>
  );
}

function EmployeeDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 150">
      <circle cx="72" cy="58" r="22" stroke={INK} strokeWidth="2" fill="white" />
      <path d="M48 98 Q72 78 96 98" stroke={INK} strokeWidth="2" fill="none" />
      <Arrow x1={102} y1={72} x2={132} y2={72} />
      <rect x="134" y="32" width="160" height="96" rx="10" fill="white" stroke={INK} strokeWidth="2" />
      <text x="214" y="52" textAnchor="middle" fontSize="10" fontWeight="600" fill={INK} fontFamily="system-ui">
        Employee form
      </text>
      <path d="M150 64 h128 M150 78 h100 M150 92 h110 M150 106 h90" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
      <Arrow x1={298} y1={72} x2={328} y2={72} />
      <rect x="330" y="44" width="120" height="72" rx="10" fill="white" stroke={INK} strokeWidth="2" />
      <path d="M350 68 h40 M350 82 h50" stroke={INK_LIGHT} strokeWidth="2" strokeLinecap="round" />
      <text x="390" y="100" textAnchor="middle" fontSize="9" fill={INK} fontFamily="system-ui">
        Portal login
      </text>
      <text x="240" y="132" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Person → record → staff access
      </text>
    </SketchSvg>
  );
}

function BranchDoodle({
  start,
  yes,
  no,
  caption,
}: {
  start: string;
  yes: string;
  no: string;
  caption: string;
}) {
  return (
    <SketchSvg viewBox="0 0 480 150">
      <Box x={190} y={24} w={100} h={32} label={start} highlight />
      <path d="M240 56 V72" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M240 72 H120 M240 72 H360" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M120 72 V84 M360 72 V84" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <Box x={70} y={86} w={100} h={32} label={yes} />
      <Box x={310} y={86} w={100} h={32} label={no} />
      <text x="240" y="132" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        {caption}
      </text>
    </SketchSvg>
  );
}

function PayslipDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 140">
      <rect x="160" y="20" width="100" height="90" rx="6" fill="white" stroke={INK} strokeWidth="2" />
      <text x="210" y="38" textAnchor="middle" fontSize="10" fontWeight="600" fill={INK} fontFamily="system-ui">
        Payslip
      </text>
      <path d="M175 50 h70 M175 62 h55 M175 74 h60 M175 86 h40" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
      <Arrow x1={264} y1={65} x2={294} y2={65} />
      <rect x="296" y="40" width="64" height="50" rx="6" fill="white" stroke={ACCENT} strokeWidth="2" />
      <text x="328" y="72" textAnchor="middle" fontSize="11" fontWeight="700" fill={ACCENT} fontFamily="system-ui">
        PDF
      </text>
      <text x="240" y="128" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Preview → download or print
      </text>
    </SketchSvg>
  );
}

function BankDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 140">
      <Box x={40} y={44} w={90} h={36} label="Run" />
      <Arrow x1={132} y1={62} x2={162} y2={62} />
      <Box x={164} y={44} w={90} h={36} label="Payslips" highlight />
      <Arrow x1={256} y1={62} x2={286} y2={62} />
      <Box x={288} y={44} w={90} h={36} label="Batch" />
      <Arrow x1={380} y1={62} x2={400} y2={62} />
      <path d="M408 50 h32 v24 h-32z M416 58 h16 M416 66 h12" stroke={INK} strokeWidth="2" fill="white" />
      <text x="240" y="118" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Approve run → pay employees via bank file
      </text>
    </SketchSvg>
  );
}

function StaffPhoneDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 150">
      <rect x="188" y="16" width="104" height="118" rx="14" fill="white" stroke={INK} strokeWidth="2.5" />
      <rect x="200" y="28" width="80" height="12" rx="4" fill={INK_FILL} />
      <circle cx="240" cy="58" r="14" stroke={INK} strokeWidth="1.5" fill={INK_FILL} />
      <rect x="208" y="82" width="28" height="22" rx="4" stroke={MUTED} strokeWidth="1.5" />
      <rect x="242" y="82" width="28" height="22" rx="4" stroke={MUTED} strokeWidth="1.5" />
      <rect x="276" y="82" width="28" height="22" rx="4" stroke={MUTED} strokeWidth="1.5" />
      <text x="222" y="96" fontSize="8" fill={MUTED} fontFamily="system-ui">Pay</text>
      <text x="254" y="96" fontSize="8" fill={MUTED} fontFamily="system-ui">Leave</text>
      <text x="284" y="96" fontSize="8" fill={MUTED} fontFamily="system-ui">Me</text>
      <text x="240" y="138" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Staff portal — tap each area to learn
      </text>
    </SketchSvg>
  );
}

function ClockInOutDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 130">
      <circle cx="120" cy="65" r="36" stroke={INK} strokeWidth="2" fill="white" />
      <path d="M120 45 v22 l14 10" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <text x="120" y="108" textAnchor="middle" fontSize="9" fill={MUTED} fontFamily="system-ui">
        Time in
      </text>
      <Arrow x1={162} y1={65} x2={200} y2={65} />
      <rect x="202" y="40" width="76" height="50" rx="8" fill="white" stroke={ACCENT} strokeWidth="2" />
      <text x="240" y="72" textAnchor="middle" fontSize="10" fill={ACCENT} fontFamily="system-ui">
        Day row
      </text>
      <Arrow x1={280} y1={65} x2={318} y2={65} />
      <circle cx="360" cy="65" r="36" stroke={INK} strokeWidth="2" fill="white" />
      <path d="M360 45 v22 l14 10" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <text x="360" y="108" textAnchor="middle" fontSize="9" fill={MUTED} fontFamily="system-ui">
        Time out
      </text>
    </SketchSvg>
  );
}

function ChartReportDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 130">
      <rect x="48" y="32" width="140" height="72" rx="8" fill="white" stroke={INK} strokeWidth="2" />
      <rect x="68" y="78" width="16" height="16" fill={INK_LIGHT} stroke={INK} strokeWidth="1" />
      <rect x="92" y="62" width="16" height="32" fill={INK} stroke={INK} strokeWidth="1" />
      <rect x="116" y="70" width="16" height="24" fill={INK_LIGHT} stroke={INK} strokeWidth="1" />
      <text x="118" y="52" textAnchor="middle" fontSize="9" fill={INK} fontFamily="system-ui">
        Analytics
      </text>
      <Arrow x1={190} y1={68} x2={220} y2={68} />
      <rect x="222" y="28" width="120" height="80" rx="8" fill="white" stroke={INK} strokeWidth="2" />
      <path d="M238 44 h88 M238 58 h70 M238 72 h80 M238 86 h50" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
      <text x="282" y="108" textAnchor="middle" fontSize="9" fill={INK} fontFamily="system-ui">
        Report PDF
      </text>
      <text x="240" y="122" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Trends first, then formal reports for filing
      </text>
    </SketchSvg>
  );
}

function SettingsDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 130">
      <circle cx="120" cy="60" r="28" stroke={INK} strokeWidth="2" fill="white" />
      <path
        d="M120 38 v6 M120 76 v6 M98 60 h-6 M142 60 h6 M104 44 l-4-4 M136 76 l4 4"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Arrow x1={152} y1={60} x2={182} y2={60} />
      <rect x="184" y="36" width="200" height="48" rx="8" fill="white" stroke={INK} strokeWidth="2" />
      <circle cx="210" cy="60" r="8" fill={INK_LIGHT} stroke={INK} />
      <rect x="232" y="54" width="80" height="12" rx="6" fill={INK_FILL} stroke={INK_LIGHT} />
      <circle cx="340" cy="60" r="8" fill="white" stroke={MUTED} />
      <text x="240" y="108" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Company · tax · users · notifications
      </text>
    </SketchSvg>
  );
}

function LoanSavingsDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 130">
      <ellipse cx="100" cy="70" rx="40" ry="32" stroke={INK} strokeWidth="2" fill="white" />
      <text x="100" y="74" textAnchor="middle" fontSize="10" fill={INK} fontFamily="system-ui">
        Save
      </text>
      <text x="240" y="74" textAnchor="middle" fontSize="14" fill={MUTED} fontFamily="system-ui">
        +
      </text>
      <rect x="300" y="42" width="100" height="56" rx="8" fill="white" stroke={INK} strokeWidth="2" />
      <text x="350" y="66" textAnchor="middle" fontSize="10" fill={INK} fontFamily="system-ui">
        Loan
      </text>
      <path d="M318 82 h64" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
      <Arrow x1={148} y1={70} x2={228} y2={70} />
      <path d="M228 70 h52" stroke={INK} strokeWidth="2" strokeDasharray="4 3" />
      <text x="240" y="108" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Admin creates loans · staff views balances
      </text>
    </SketchSvg>
  );
}

function SetupDoodle() {
  return (
    <FlowDoodle
      steps={["Component", "Assign", "OT rule", "Check"]}
      caption="Build pay rules, then assign to people"
    />
  );
}

function ShieldDoodle() {
  return (
    <SketchSvg viewBox="0 0 480 120">
      <path
        d="M240 24 L280 40 V68 Q240 92 200 68 V40 Z"
        stroke={INK}
        strokeWidth="2"
        fill="white"
      />
      <path d="M228 58 l8 8 16-16" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
      <text x="240" y="108" textAnchor="middle" fontSize="10" fill={MUTED} fontFamily="system-ui">
        Your data · privacy & profile
      </text>
    </SketchSvg>
  );
}

const DOODLE_MAP: Record<string, React.FC> = {
  "dashboard-todos": DashboardDoodle,
  employees: EmployeeDoodle,
  timesheets: () => (
    <FlowDoodle steps={["Draft", "Submitted", "Approved", "Locked"]} caption="Only Approved & Locked hours are paid" />
  ),
  leave: () => (
    <BranchDoodle start="Pending" yes="Approved" no="Rejected" caption="Manager decides — approved leave hits payroll" />
  ),
  "payroll-setup": SetupDoodle,
  "payroll-runs": BankDoodle,
  payslips: PayslipDoodle,
  "savings-loans": LoanSavingsDoodle,
  "analytics-reports": ChartReportDoodle,
  settings: SettingsDoodle,
  "staff-getting-started": StaffPhoneDoodle,
  "staff-payslips": PayslipDoodle,
  "staff-timesheets": ClockInOutDoodle,
  "staff-leave": () => (
    <BranchDoodle start="Request" yes="Approved" no="Rejected" caption="Submit early — wait for Approved status" />
  ),
  "staff-savings-loans": LoanSavingsDoodle,
  "staff-profile": ShieldDoodle,
};

interface TrainingWorkflowDoodleProps {
  manualId: string;
  title: string;
  className?: string;
}

const TrainingWorkflowDoodle: React.FC<TrainingWorkflowDoodleProps> = ({ manualId, title, className }) => {
  const Doodle = DOODLE_MAP[manualId];
  if (!Doodle) return null;

  return (
    <figure className={cn("overflow-hidden rounded-xl border bg-gradient-to-b from-cyan-50/40 to-white p-3", className)}>
      <figcaption className="sr-only">Workflow sketch for {title}</figcaption>
      <Doodle />
      <p className="mt-1 text-center text-[10px] font-medium uppercase tracking-wide text-cyan-800/60">
        Quick visual
      </p>
    </figure>
  );
};

export default TrainingWorkflowDoodle;

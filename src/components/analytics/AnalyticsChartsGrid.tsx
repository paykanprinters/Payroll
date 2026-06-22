"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import { useDataVisualsFontSize } from "@/hooks/use-data-visuals-font-size";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import ChartEmptyState from "@/components/dashboard/ChartEmptyState";
import type { AnalyticsChartData } from "@/lib/analytics-metrics";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#a4de6c", "#d0ed57"];

type AccentVariant = "sky" | "amber" | "emerald" | "orange";

function ChartShell({
  title,
  description,
  accent,
  children,
  isEmpty,
  emptyMessage,
}: {
  title: string;
  description: string;
  accent: AccentVariant;
  children: React.ReactNode;
  isEmpty?: boolean;
  emptyMessage?: string;
}) {
  return (
    <Card className="relative h-full overflow-hidden rounded-xl border bg-white shadow-sm">
      <SummaryAccent variant={accent} />
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px] md:h-[350px]">
        {isEmpty ? (
          <ChartEmptyState message={emptyMessage || "No data for the selected period."} />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function renderLegendText(value: string, entry: { payload?: { value?: number } }, total: number) {
  const percentage = total > 0 ? Math.round(((entry.payload?.value || 0) / total) * 100) : 0;
  return `${value} (${percentage}%)`;
}

interface AnalyticsChartsGridProps {
  data: AnalyticsChartData;
  variant?: "admin" | "staff";
}

const AnalyticsChartsGrid: React.FC<AnalyticsChartsGridProps> = ({ data, variant = "admin" }) => {
  const fontSize = useDataVisualsFontSize();
  const zar = (value: number) => `R ${value.toLocaleString("en-ZA")}`;

  const totalCompensation = data.compensationBreakdown.reduce((s, e) => s + e.value, 0);
  const totalDeductions = data.deductionCategoryBreakdown.reduce((s, e) => s + e.value, 0);
  const totalLeave = data.leaveTypeDistribution.reduce((s, e) => s + e.value, 0);
  const totalTenure = data.employeeTenureDistribution.reduce((s, e) => s + e.value, 0);
  const totalSalaryBuckets = data.employeeSalaryDistribution.reduce((s, e) => s + e.count, 0);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
      <ChartShell
        title={variant === "staff" ? "Your monthly payroll trend" : "Monthly payroll cost trend"}
        description="Gross and net pay over time."
        accent="sky"
        isEmpty={data.monthlyPayrollTrend.length === 0}
        emptyMessage="Run payroll to see monthly cost trends."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.monthlyPayrollTrend} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize }} />
            <YAxis tickFormatter={zar} style={{ fontSize }} />
            <Tooltip formatter={(v: number) => zar(v)} contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize }} />
            <Line type="monotone" dataKey="gross" stroke="#8884d8" name="Gross" dot={false} />
            <Line type="monotone" dataKey="net" stroke="#82ca9d" name="Net" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title={variant === "staff" ? "Your earnings breakdown" : "Compensation type breakdown"}
        description="Earnings split by type (basic, overtime, bonus, etc.)."
        accent="emerald"
        isEmpty={totalCompensation === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.compensationBreakdown}
              cx="50%"
              cy="46%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              labelLine={false}
              style={{ fontSize }}
            >
              {data.compensationBreakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => zar(v)} contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize }}
              formatter={(value, entry) => renderLegendText(value, entry, totalCompensation)}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title={variant === "staff" ? "Your deduction breakdown" : "Deduction category breakdown"}
        description="Statutory (PAYE, UIF, SDL) vs other deductions."
        accent="orange"
        isEmpty={totalDeductions === 0}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.deductionCategoryBreakdown}
              cx="50%"
              cy="46%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              labelLine={false}
              style={{ fontSize }}
            >
              {data.deductionCategoryBreakdown.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => zar(v)} contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize }}
              formatter={(value, entry) => renderLegendText(value, entry, totalDeductions)}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>

      {variant === "admin" && (
        <ChartShell
          title="Employee turnover trend"
          description="New hires vs terminations by month (current year)."
          accent="amber"
          isEmpty={data.employeeTurnoverTrend.every((r) => r.newHires === 0 && r.terminations === 0)}
          emptyMessage="No hire or termination activity recorded this year."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.employeeTurnoverTrend} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" style={{ fontSize }} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis allowDecimals={false} style={{ fontSize }} />
              <Tooltip contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize }} />
              <Bar dataKey="newHires" fill="#00C49F" name="New hires" radius={[4, 4, 0, 0]} />
              <Bar dataKey="terminations" fill="#FF8042" name="Terminations" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      )}

      <ChartShell
        title={variant === "staff" ? "Your leave breakdown" : "Leave type distribution"}
        description="Working days taken by leave type."
        accent="sky"
        isEmpty={totalLeave === 0}
        emptyMessage="No leave records in the selected period."
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.leaveTypeDistribution}
              cx="50%"
              cy="46%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              labelLine={false}
              style={{ fontSize }}
            >
              {data.leaveTypeDistribution.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => `${v} days`}
              contentStyle={{ fontSize }}
              labelStyle={{ fontSize }}
            />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize }}
              formatter={(value, entry) => renderLegendText(value, entry, totalLeave)}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>

      {variant === "admin" && (
        <ChartShell
          title="Employee salary distribution"
          description="Headcount by monthly salary band."
          accent="emerald"
          isEmpty={totalSalaryBuckets === 0}
          emptyMessage="Add employees with salary or hourly rates."
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.employeeSalaryDistribution} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" style={{ fontSize }} interval={0} />
              <YAxis allowDecimals={false} style={{ fontSize }} />
              <Tooltip contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize }} />
              <Bar dataKey="count" fill="#FFBB28" name="Employees" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartShell>
      )}

      <ChartShell
        title={variant === "staff" ? "Your overtime trend" : "Overtime cost trend"}
        description="Monthly overtime spend from payslip earnings."
        accent="orange"
        isEmpty={data.overtimeCostTrend.length === 0 || data.overtimeCostTrend.every((r) => r.overtime === 0)}
        emptyMessage="No overtime earnings in the selected period."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.overtimeCostTrend} margin={{ top: 8, right: 12, left: 4, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" style={{ fontSize }} />
            <YAxis tickFormatter={zar} style={{ fontSize }} />
            <Tooltip formatter={(v: number) => zar(v)} contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize }} />
            <Line type="monotone" dataKey="overtime" stroke="#00C49F" name="Overtime" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartShell>

      <ChartShell
        title={variant === "staff" ? "Your tenure" : "Employee tenure distribution"}
        description="Length of service across the workforce."
        accent="amber"
        isEmpty={totalTenure === 0}
        emptyMessage="No employee start dates available."
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data.employeeTenureDistribution}
              cx="50%"
              cy="46%"
              innerRadius={55}
              outerRadius={85}
              dataKey="value"
              labelLine={false}
              style={{ fontSize }}
            >
              {data.employeeTenureDistribution.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ fontSize }} labelStyle={{ fontSize }} />
            <Legend
              layout="horizontal"
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{ fontSize }}
              formatter={(value, entry) => renderLegendText(value, entry, totalTenure)}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartShell>
    </div>
  );
};

export default AnalyticsChartsGrid;

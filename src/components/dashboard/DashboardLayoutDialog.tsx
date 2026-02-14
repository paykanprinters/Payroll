"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GripVertical, LayoutGrid } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DashboardWidgetKey,
  DashboardWidgetSection,
} from "@/hooks/use-dashboard-settings";
import { cn } from "@/lib/utils";

const SECTION_LABELS: Record<DashboardWidgetSection, string> = {
  main: "Main column",
  side: "Right column",
  charts: "Charts grid",
};

const WIDGET_LABELS: Record<DashboardWidgetKey, string> = {
  summaryCards: "Summary Cards",
  upcomingPayrollCard: "Upcoming Payroll",
  toDoListCard: "Payroll To-Dos",
  monthlyPayrollOverviewChart: "Monthly Payroll Overview",
  currentDateCalendar: "Current Date",
  employeeJobTitleDistributionChart: "Job Title Distribution",
  totalDeductionsBreakdownChart: "Deductions Breakdown",
  averageNetPayTrendChart: "Average Net Pay Trend",
  employeeSalaryDistributionChart: "Salary Distribution",
  monthlyLeaveDaysTakenChart: "Leave Days Taken",
  quickActionsCard: "Quick Actions",
  payrollRunCard: "Payroll Run",
  timesheetStatusChart: "Timesheet Status",
  savingsStatusChart: "Savings Status",
  loansOverviewCard: "Loans & Advancements",
};

function SortableRow({
  id,
  label,
  meta,
}: {
  id: string;
  label: string;
  meta?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2",
        isDragging && "opacity-70"
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{label}</div>
        {meta ? <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div> : null}
      </div>

      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
        {...attributes}
        {...listeners}
        aria-label="Drag"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

export default function DashboardLayoutDialog({
  order,
  visible,
  onMove,
}: {
  order: (section: DashboardWidgetSection) => DashboardWidgetKey[];
  visible: (key: DashboardWidgetKey) => boolean;
  onMove: (key: DashboardWidgetKey, section: DashboardWidgetSection, toIndex: number) => void;
}) {
  const [open, setOpen] = React.useState(false);

  // Local draft ordering while the dialog is open
  const [draft, setDraft] = React.useState<Record<DashboardWidgetSection, DashboardWidgetKey[]>>({
    main: [],
    side: [],
    charts: [],
  });

  React.useEffect(() => {
    if (!open) return;
    setDraft({
      main: order("main"),
      side: order("side"),
      charts: order("charts"),
    });
  }, [open, order]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (section: DashboardWidgetSection) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const fromId = String(active.id) as DashboardWidgetKey;
    const toId = String(over.id) as DashboardWidgetKey;

    const current = draft[section];
    const fromIndex = current.indexOf(fromId);
    const toIndex = current.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;
    if (fromIndex === toIndex) return;

    const next = [...current];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, fromId);

    setDraft((p) => ({ ...p, [section]: next }));

    // Persist immediately
    onMove(fromId, section, toIndex);
  };

  const handleMoveToSection = (
    key: DashboardWidgetKey,
    from: DashboardWidgetSection,
    to: DashboardWidgetSection
  ) => {
    setDraft((p) => {
      const nextFrom = p[from].filter((k) => k !== key);
      const nextTo = [key, ...p[to].filter((k) => k !== key)];

      // Persist: put at top of new section
      onMove(key, to, 0);

      return { ...p, [from]: nextFrom, [to]: nextTo };
    });
  };

  const Section = ({ section }: { section: DashboardWidgetSection }) => {
    const ids = draft[section];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">{SECTION_LABELS[section]}</div>
          <Badge variant="secondary" className="font-normal">
            {ids.length}
          </Badge>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd(section)}
        >
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {ids.map((k) => {
                const label = WIDGET_LABELS[k] ?? k;
                const isVisible = visible(k);

                return (
                  <SortableRow
                    key={k}
                    id={k}
                    label={label}
                    meta={
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={isVisible ? "secondary" : "outline"}
                          className={cn(!isVisible && "text-muted-foreground")}
                        >
                          {isVisible ? "Visible" : "Hidden"}
                        </Badge>

                        <div className="flex items-center gap-1">
                          {(Object.keys(SECTION_LABELS) as DashboardWidgetSection[])
                            .filter((s) => s !== section)
                            .map((target) => (
                              <Button
                                key={target}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleMoveToSection(k, section, target)}
                              >
                                Move to {SECTION_LABELS[target]}
                              </Button>
                            ))}
                        </div>
                      </div>
                    }
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <LayoutGrid className="h-4 w-4" />
          Arrange widgets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Arrange dashboard widgets</DialogTitle>
        </DialogHeader>

        <div className="text-sm text-muted-foreground">
          Drag to reorder within a section, or use “Move to …” to move widgets between sections.
        </div>

        <Separator />

        <div className="grid gap-6 md:grid-cols-3">
          <Section section="main" />
          <Section section="side" />
          <Section section="charts" />
        </div>
      </DialogContent>
    </Dialog>
  );
}

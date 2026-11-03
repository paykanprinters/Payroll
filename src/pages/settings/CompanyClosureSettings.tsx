"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { CalendarOff, Loader2, Pencil, Plus, Send, Trash2, Undo2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import { useAuth } from "@/hooks/use-auth";
import { showError, showSuccess } from "@/utils/toast";
import {
  buildClosureLeaveRecords,
  buildClosurePreview,
  buildClosureTimesheets,
  closureEmployees,
  closurePayWeeks,
  expandClosureDays,
  lastWorkDayBefore,
  type CompanyClosure,
} from "@/lib/company-closure";
import {
  deleteClosure,
  fetchClosures,
  publishClosure,
  saveClosureDraft,
  sendClosurePush,
  unpublishClosure,
} from "@/integrations/supabase/closure-queries";
import { formatLeaveBalance } from "@/lib/leave-accrual";
import { filterEmployedAt } from "@/lib/employee-active-period";
import ClosurePayoutPanel from "@/components/settings/ClosurePayoutPanel";

type Draft = Omit<CompanyClosure, "id" | "status" | "publishedAt"> & { id?: string };

const emptyDraft = (): Draft => ({
  name: `December ${new Date().getFullYear()} shutdown`,
  startDate: "",
  endDate: "",
  payoutDate: "",
  excludedEmployeeIds: [],
});

const formatDay = (iso: string) => (iso ? format(parseISO(iso), "EEE d MMM yyyy") : "—");

const weekKindLabel = { closing: "Closing week", shutdown: "Shutdown week", reopening: "Re-opening week" } as const;

const CompanyClosureSettings: React.FC = () => {
  const { user } = useAuth();
  const {
    employees,
    leaveRecords,
    timesheets,
    publicHolidays,
    workHoursSettings,
    payCycleSettings,
    isMockDataEnabled,
    refetchLeaveRecords,
    refetchTimesheets,
  } = usePayrollProcessor();
  const canEdit = user?.role === "Admin" || user?.role === "Manager";
  const cutOffDay = payCycleSettings?.cutOffDay ?? 2;
  const workDays = workHoursSettings?.workDays;

  const [closures, setClosures] = useState<CompanyClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await fetchClosures();
    setClosures(list);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    if (!isMockDataEnabled) void load();
    else setLoading(false);
  }, [isMockDataEnabled, load]);

  const selected = closures.find((c) => c.id === selectedId) || null;
  const previewSource = useMemo<CompanyClosure | null>(
    () => (draft ? { ...draft, id: draft.id || "draft", status: "draft" } : selected),
    [draft, selected]
  );
  const datesValid = !!previewSource?.startDate && !!previewSource?.endDate && previewSource.startDate <= previewSource.endDate;

  const preview = useMemo(
    () =>
      previewSource && datesValid
        ? buildClosurePreview({
            closure: previewSource,
            employees,
            leaveRecords,
            holidays: publicHolidays || [],
            workDays,
          })
        : [],
    [previewSource, datesValid, employees, leaveRecords, publicHolidays, workDays]
  );

  const payWeeks = useMemo(
    () => (previewSource && datesValid ? closurePayWeeks(previewSource, cutOffDay) : []),
    [previewSource, datesValid, cutOffDay]
  );

  const currentEmployees = useMemo(() => filterEmployedAt(employees), [employees]);

  const startNew = () => {
    setSelectedId(null);
    setDraft(emptyDraft());
  };

  const editClosure = (closure: CompanyClosure) => {
    setSelectedId(closure.id);
    setDraft({
      id: closure.id,
      name: closure.name,
      startDate: closure.startDate,
      endDate: closure.endDate,
      payoutDate: closure.payoutDate,
      excludedEmployeeIds: closure.excludedEmployeeIds,
    });
  };

  const updateDraft = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      const holidays = publicHolidays || [];
      const payoutWasDefault =
        !prev.payoutDate || (!!prev.startDate && prev.payoutDate === lastWorkDayBefore(prev.startDate, workDays, holidays));
      if (patch.startDate && payoutWasDefault) {
        next.payoutDate = lastWorkDayBefore(patch.startDate, workDays, holidays);
      }
      return next;
    });
  };

  const toggleExcluded = (employeeId: string, excluded: boolean) => {
    if (!draft) return;
    const set = new Set(draft.excludedEmployeeIds);
    if (excluded) set.add(employeeId);
    else set.delete(employeeId);
    updateDraft({ excludedEmployeeIds: Array.from(set) });
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.startDate || !draft.endDate || !draft.payoutDate) {
      showError("Enter a name, the first and last closed day, and the payout date.");
      return;
    }
    if (draft.endDate < draft.startDate) {
      showError("The last closed day must be on or after the first closed day.");
      return;
    }
    if (draft.payoutDate > draft.startDate) {
      showError("The payout date must be on or before the first closed day.");
      return;
    }
    setBusy(true);
    const result = await saveClosureDraft(draft);
    setBusy(false);
    if (!result.ok) {
      showError(`Could not save the closure: ${result.error}`);
      return;
    }
    showSuccess("Closure saved as a draft. Check the preview, then publish.");
    await load();
    setDraft(null);
    setSelectedId(result.data.id);
  };

  const handleDelete = async (closure: CompanyClosure) => {
    if (!window.confirm(`Delete the draft "${closure.name}"?`)) return;
    setBusy(true);
    const result = await deleteClosure(closure.id);
    setBusy(false);
    if (!result.ok) {
      showError(`Could not delete: ${result.error}`);
      return;
    }
    if (selectedId === closure.id) setSelectedId(null);
    await load();
  };

  const handlePublish = async (closure: CompanyClosure) => {
    const rows = buildClosurePreview({ closure, employees, leaveRecords, holidays: publicHolidays || [], workDays });
    const totalDays = rows.reduce((s, r) => s + r.leaveDays, 0);
    const advanceCount = rows.filter((r) => r.advanceDays > 0).length;
    const message =
      `Publish "${closure.name}"?\n\n` +
      `This books ${totalDays} Annual Leave day(s) for ${rows.length} employee(s)` +
      (advanceCount > 0 ? `, ${advanceCount} of them partly in advance` : "") +
      `, creates their leave timesheets, and notifies staff in the app.`;
    if (!window.confirm(message)) return;

    setBusy(true);
    try {
      const now = new Date().toISOString();
      const leave = [];
      const sheets = [];
      for (const employee of closureEmployees(closure, employees)) {
        const { leaveDays } = expandClosureDays({
          closure,
          employee,
          holidays: publicHolidays || [],
          workDays,
          leaveRecords,
        });
        leave.push(...buildClosureLeaveRecords({ closure, employee, leaveDays, newId: uuidv4, now }));
        sheets.push(
          ...buildClosureTimesheets({ closure, employee, leaveDays, timesheets, workHours: workHoursSettings, newId: uuidv4, now })
        );
      }
      const result = await publishClosure(closure.id, leave, sheets);
      if (!result.ok) {
        showError(`Could not publish the closure: ${result.error}`);
        return;
      }
      await Promise.all([refetchLeaveRecords?.(), refetchTimesheets?.(), load()]);
      showSuccess(`Published. ${leave.length} leave record(s) and ${sheets.length} leave timesheet(s) created.`);

      const push = await sendClosurePush(closure.id);
      if (push.ok) {
        if ((push.sent ?? 0) > 0) showSuccess(`Closure notice sent to ${push.sent} phone(s).`);
      } else if (!push.disabled) {
        showError(`Closure published, but the phone notification failed: ${push.error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnpublish = async (closure: CompanyClosure) => {
    if (
      !window.confirm(
        `Un-publish "${closure.name}"? The closure leave and its leave timesheets are removed, and balances go back to what they were.`
      )
    )
      return;
    setBusy(true);
    const result = await unpublishClosure(closure.id);
    setBusy(false);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    await Promise.all([refetchLeaveRecords?.(), refetchTimesheets?.(), load()]);
    showSuccess("Closure moved back to draft.");
  };

  if (isMockDataEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company Closure</CardTitle>
          <CardDescription>Disable mock data to set up a company closure.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-primary" />
              Company Closure
            </CardTitle>
            <CardDescription className="mt-1 max-w-2xl">
              The annual shutdown. Weekdays in the closure are booked as Annual Leave (staff without enough
              leave go into advance, recovered from next year&apos;s accrual). Public holidays are paid as holidays and
              use no leave. The closing week and full shutdown weeks are paid on the payout date; the re-opening week is
              paid as normal.
            </CardDescription>
          </div>
          {canEdit && !draft && (
            <Button onClick={startNew} disabled={busy}>
              <Plus className="h-4 w-4" />
              New closure
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading closures…
            </div>
          ) : closures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No closures yet.</p>
          ) : (
            closures.map((closure) => (
              <div
                key={closure.id}
                className={`flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between ${
                  selectedId === closure.id ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <button type="button" className="text-left" onClick={() => { setDraft(null); setSelectedId(closure.id); }}>
                  <div className="flex items-center gap-2 font-medium">
                    {closure.name}
                    <Badge variant={closure.status === "published" ? "default" : "secondary"}>
                      {closure.status === "published" ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Closed {formatDay(closure.startDate)} – {formatDay(closure.endDate)} · Paid out {formatDay(closure.payoutDate)}
                  </div>
                </button>
                {canEdit && (
                  <div className="flex flex-wrap gap-2">
                    {closure.status === "draft" ? (
                      <>
                        <Button variant="outline" size="sm" onClick={() => editClosure(closure)} disabled={busy}>
                          <Pencil className="h-4 w-4" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => handlePublish(closure)} disabled={busy}>
                          <Send className="h-4 w-4" /> Publish
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(closure)} disabled={busy}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => handleUnpublish(closure)} disabled={busy}>
                        <Undo2 className="h-4 w-4" /> Un-publish
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader>
            <CardTitle>{draft.id ? "Edit closure" : "New closure"}</CardTitle>
            <CardDescription>Saved as a draft. Nothing changes for staff until you publish.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label htmlFor="closure-name">Name</Label>
                <Input id="closure-name" value={draft.name} onChange={(e) => updateDraft({ name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="closure-start">First closed day</Label>
                <Input
                  id="closure-start"
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => updateDraft({ startDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="closure-end">Last closed day</Label>
                <Input
                  id="closure-end"
                  type="date"
                  value={draft.endDate}
                  onChange={(e) => updateDraft({ endDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">The day before the factory re-opens.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="closure-payout">Payout date</Label>
                <Input
                  id="closure-payout"
                  type="date"
                  value={draft.payoutDate}
                  onChange={(e) => updateDraft({ payoutDate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Usually the last working day before the closure.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Staff who keep working (no closure leave)</Label>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {currentEmployees.map((employee) => {
                  const checked = draft.excludedEmployeeIds.includes(employee.id);
                  return (
                    <label key={employee.id} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm">
                      <Checkbox checked={checked} onCheckedChange={(v) => toggleExcluded(employee.id, v === true)} />
                      {employee.firstName} {employee.lastName}
                      <span className="ml-auto text-xs text-muted-foreground">{employee.customEmployeeId}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Save draft
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {previewSource && datesValid && (
        <Card>
          <CardHeader>
            <CardTitle>Preview: {previewSource.name}</CardTitle>
            <CardDescription>
              Leave balances are measured at the end of the closure in each leave cycle. Negative balances are leave in
              advance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Leave days</TableHead>
                    <TableHead className="text-right">Public holidays</TableHead>
                    <TableHead className="text-right">Balance before</TableHead>
                    <TableHead className="text-right">Balance after</TableHead>
                    <TableHead className="text-right">In advance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row) => (
                    <TableRow key={row.employee.id}>
                      <TableCell>
                        <div className="font-medium">
                          {row.employee.firstName} {row.employee.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {row.employee.hourlyRate && row.employee.hourlyRate > 0 ? "Hourly" : "Salaried"}
                          {row.alreadyOnLeave > 0 && ` · ${row.alreadyOnLeave} day(s) already on leave`}
                          {row.segments.length > 1 && " · split across two leave cycles"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.leaveDays}</TableCell>
                      <TableCell className="text-right">{row.holidayDays}</TableCell>
                      <TableCell className="text-right">{row.balanceBefore}</TableCell>
                      <TableCell className={`text-right font-medium ${row.balanceAfter < 0 ? "text-red-600" : ""}`}>
                        {formatLeaveBalance(row.balanceAfter)}
                      </TableCell>
                      <TableCell className={`text-right ${row.advanceDays > 0 ? "text-red-600" : "text-muted-foreground"}`}>
                        {row.advanceDays > 0 ? row.advanceDays : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold">Pay weeks</h4>
              <div className="grid gap-2 md:grid-cols-2">
                {payWeeks.map((week) => (
                  <div key={week.start} className="rounded-lg border px-3 py-2 text-sm">
                    <div className="font-medium">
                      {weekKindLabel[week.kind]}: {formatDay(week.start)} – {formatDay(week.end)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {week.paidInAdvance
                        ? `Paid in advance on ${formatDay(previewSource.payoutDate)}`
                        : "Paid in the normal run after re-opening"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {payWeeks.some((w) => w.kind === "closing") && (
              <Alert>
                <AlertTitle>Before the payout</AlertTitle>
                <AlertDescription>
                  Import the clock-ins for the worked days of the closing week first, so they are on the payout.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {selected && selected.status === "published" && !draft && (
        <ClosurePayoutPanel closure={selected} weeks={payWeeks} />
      )}
    </div>
  );
};

export default CompanyClosureSettings;

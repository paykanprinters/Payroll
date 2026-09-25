"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor-context";
import {
  fetchEarningComponents,
  fetchDeductionComponents,
  fetchEmployeeAssignments,
  upsertEmployeeAssignment,
  deleteEmployeeAssignment,
  EmployeeComponentAssignment,
  EarningComponent,
  DeductionComponent,
  ComponentType,
} from "@/integrations/supabase/compensation-queries";
import PayrollAdminHeader from "@/components/payroll/PayrollAdminHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { formatEmployeePickerLabel } from "@/lib/employment-status";

const EmployeeAssignmentsPage: React.FC = () => {
  const { employees } = usePayrollProcessor();
  const [earnings, setEarnings] = useState<EarningComponent[]>([]);
  const [deductions, setDeductions] = useState<DeductionComponent[]>([]);
  const [assignments, setAssignments] = useState<EmployeeComponentAssignment[]>([]);

  const [form, setForm] = useState<Partial<EmployeeComponentAssignment>>({
    componentType: "earning",
  });

  const refresh = async () => {
    setEarnings(await fetchEarningComponents());
    setDeductions(await fetchDeductionComponents());
    setAssignments(await fetchEmployeeAssignments());
  };

  useEffect(() => {
    refresh();
  }, []);

  const componentOptions = useMemo(() => {
    return form.componentType === "earning" ? earnings : deductions;
  }, [form.componentType, earnings, deductions]);

  const employeesById = useMemo(() => {
    const map = new Map<string, string>();
    employees.forEach((e) => map.set(e.id, `${e.firstName} ${e.lastName}`.trim()));
    return map;
  }, [employees]);

  const componentsById = useMemo(() => {
    const m = new Map<string, string>();
    earnings.forEach((c) => m.set(c.id, c.name));
    deductions.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [earnings, deductions]);

  const saveAssignment = async () => {
    if (!form.employeeId || !form.componentType || !form.componentId) {
      showError("Employee, component type and component selection are required.");
      return;
    }
    const saved = await upsertEmployeeAssignment(form);
    if (saved) {
      showSuccess("Assignment saved.");
      setForm({ componentType: "earning" });
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      <PayrollAdminHeader
        title="Employee Assignments"
        subtitle="Attach earnings and deductions to specific employees with effective dates and overrides."
      />

      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle className="text-xl">Assign a component</CardTitle>
          <CardDescription>Overrides are optional. Effective dates control when it applies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Employee</Label>
              <Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {formatEmployeePickerLabel(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Component type</Label>
              <Select
                value={form.componentType as string}
                onValueChange={(v) => setForm({ ...form, componentType: v as ComponentType, componentId: undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Component type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="earning">Earning</SelectItem>
                  <SelectItem value="deduction">Deduction</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Component</Label>
              <Select value={form.componentId || ""} onValueChange={(v) => setForm({ ...form, componentId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select component" />
                </SelectTrigger>
                <SelectContent>
                  {componentOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Override amount (optional)</Label>
              <Input
                type="number"
                placeholder="Leave blank to use default"
                value={form.overrideAmount ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    overrideAmount: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div className="space-y-1">
              <Label>Effective start</Label>
              <Input type="date" value={form.effectiveStart || ""} onChange={(e) => setForm({ ...form, effectiveStart: e.target.value })} />
            </div>

            <div className="space-y-1">
              <Label>Effective end</Label>
              <Input type="date" value={form.effectiveEnd || ""} onChange={(e) => setForm({ ...form, effectiveEnd: e.target.value })} />
            </div>

            <div className="space-y-1 md:col-span-3">
              <Label>Notes (optional)</Label>
              <Input placeholder="Any special notes" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveAssignment}>
              <Plus className="h-4 w-4" />
              Save assignment
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-white shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Current assignments</CardTitle>
            <CardDescription>Review and remove employee-level overrides.</CardDescription>
          </div>
          <Badge variant="outline" className="bg-background">{assignments.length}</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Component</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{employeesById.get(a.employeeId) || a.employeeId}</div>
                      <div className="font-mono text-xs text-muted-foreground">{a.employeeId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={a.componentType === "earning" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}>
                        {a.componentType}
                      </Badge>
                    </TableCell>
                    <TableCell>{componentsById.get(a.componentId) || a.componentId}</TableCell>
                    <TableCell>{a.overrideAmount ?? "-"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.effectiveStart || "-"} → {a.effectiveEnd || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await deleteEmployeeAssignment(a.id);
                          showSuccess("Deleted");
                          refresh();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {assignments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No assignments
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAssignmentsPage;
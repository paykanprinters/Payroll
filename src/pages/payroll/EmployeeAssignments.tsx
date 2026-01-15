"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { showSuccess, showError } from "@/utils/toast";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import {
  fetchEarningComponents,
  fetchDeductionComponents,
  fetchEmployeeAssignments,
  upsertEmployeeAssignment,
  deleteEmployeeAssignment,
  EmployeeComponentAssignment,
  EarningComponent,
  DeductionComponent,
} from "@/integrations/supabase/compensation-queries";

const EmployeeAssignmentsPage: React.FC = () => {
  const { employees } = usePayrollProcessor({ silent: true });
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
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Assign Component to Employee</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={form.employeeId || ""} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
            <SelectTrigger><SelectValue placeholder="Employee" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={form.componentType as string} onValueChange={(v) => setForm({ ...form, componentType: v as any, componentId: undefined })}>
            <SelectTrigger><SelectValue placeholder="Component Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="earning">Earning</SelectItem>
              <SelectItem value="deduction">Deduction</SelectItem>
            </SelectContent>
          </Select>
          <Select value={form.componentId || ""} onValueChange={(v) => setForm({ ...form, componentId: v })}>
            <SelectTrigger><SelectValue placeholder="Component" /></SelectTrigger>
            <SelectContent>
              {componentOptions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="Override amount (optional)" value={form.overrideAmount ?? ""} onChange={(e) => setForm({ ...form, overrideAmount: e.target.value ? Number(e.target.value) : undefined })} />
          <Input type="date" value={form.effectiveStart || ""} onChange={(e) => setForm({ ...form, effectiveStart: e.target.value })} />
          <Input type="date" value={form.effectiveEnd || ""} onChange={(e) => setForm({ ...form, effectiveEnd: e.target.value })} />
          <Input placeholder="Notes (optional)" value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={saveAssignment}>Save Assignment</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Current Assignments</CardTitle></CardHeader>
        <CardContent>
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
              {assignments.map(a => {
                const emp = employees.find(e => e.id === a.employeeId);
                const comp = (a.componentType === "earning" ? earnings : deductions).find(c => c.id === a.componentId);
                return (
                  <TableRow key={a.id}>
                    <TableCell>{emp ? `${emp.firstName} ${emp.lastName}` : a.employeeId}</TableCell>
                    <TableCell>{a.componentType}</TableCell>
                    <TableCell>{comp?.name || a.componentId}</TableCell>
                    <TableCell>{a.overrideAmount ?? "-"}</TableCell>
                    <TableCell>{a.effectiveStart || "-"} → {a.effectiveEnd || "-"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" onClick={async () => { await deleteEmployeeAssignment(a.id); showSuccess("Deleted"); refresh(); }}>Delete</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {assignments.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No assignments</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeAssignmentsPage;
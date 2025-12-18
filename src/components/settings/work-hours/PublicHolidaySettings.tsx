"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { usePublicHolidays, PublicHoliday, getDefaultSouthAfricanHolidays } from "@/hooks/use-public-holidays";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";
import { useAuth } from "@/context/AuthContext";

type Props = {
  className?: string;
};

const PublicHolidaySettings: React.FC<Props> = () => {
  const { user } = useAuth();
  const { isMockDataEnabled, isAuthenticated, isLoadingAuth, activeTaxYearForCalculations } = usePayrollProcessor({ silent: true });
  const { publicHolidays, isLoadingPublicHolidays, saveHoliday, deleteHoliday, importDefaultSouthAfricanHolidays } =
    usePublicHolidays({ isMockDataEnabled, isAuthenticated, isLoadingAuth });

  const canEdit = user?.role === "Admin";

  const [form, setForm] = useState<{ id?: string; name: string; date: string; recurring: boolean; visibleInCalendar: boolean; departments: string }>({
    name: "",
    date: "",
    recurring: true,
    visibleInCalendar: true,
    departments: "",
  });

  const onSave = async () => {
    if (!form.name || !form.date) return;
    await saveHoliday({
      id: form.id,
      name: form.name,
      date: form.date,
      recurring: form.recurring,
      visibleInCalendar: form.visibleInCalendar,
      departments: form.departments ? form.departments.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
    setForm({ name: "", date: "", recurring: true, visibleInCalendar: true, departments: "" });
  };

  const onEdit = (h: PublicHoliday) => {
    setForm({
      id: h.id,
      name: h.name,
      date: h.date,
      recurring: h.recurring ?? true,
      visibleInCalendar: h.visibleInCalendar ?? true,
      departments: (h.departments || []).join(", "),
    });
  };

  const currentYear = activeTaxYearForCalculations || new Date().getFullYear();
  const defaultCount = useMemo(() => getDefaultSouthAfricanHolidays(currentYear).length, [currentYear]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Public Holiday Settings</CardTitle>
        <CardDescription>
          Configure South African public holidays. Holidays on a regular workday are non-workable unless timesheets exist. Pay rules: No timesheet = 1.5x, Worked = 2.0x.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="holidayName">Holiday Name</Label>
              <Input id="holidayName" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} disabled={!canEdit} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="holidayDate">Holiday Date</Label>
              <Input id="holidayDate" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} disabled={!canEdit} className="mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Checkbox id="recurring" checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: !!v })} disabled={!canEdit} />
              <Label htmlFor="recurring">Recurring annually</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="visible" checked={form.visibleInCalendar} onCheckedChange={(v) => setForm({ ...form, visibleInCalendar: !!v })} disabled={!canEdit} />
              <Label htmlFor="visible">Show in calendar</Label>
            </div>
          </div>
          <div>
            <Label htmlFor="departments">Apply to departments (comma-separated, optional)</Label>
            <Input id="departments" value={form.departments} onChange={(e) => setForm({ ...form, departments: e.target.value })} disabled={!canEdit} className="mt-1" placeholder="e.g., Sales, Engineering" />
          </div>
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={!canEdit}>Save Holiday</Button>
            <Button variant="secondary" onClick={() => importDefaultSouthAfricanHolidays(currentYear)} disabled={!canEdit}>
              Import SA Defaults ({defaultCount})
            </Button>
          </div>
        </div>

        <div className="mt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Recurring</TableHead>
                <TableHead>Visible</TableHead>
                <TableHead>Departments</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingPublicHolidays ? (
                <TableRow><TableCell colSpan={6}>Loading holidays...</TableCell></TableRow>
              ) : publicHolidays.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-muted-foreground">No holidays configured.</TableCell></TableRow>
              ) : (
                publicHolidays.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.name}</TableCell>
                    <TableCell>{h.date}</TableCell>
                    <TableCell>{h.recurring ? "Yes" : "No"}</TableCell>
                    <TableCell>{h.visibleInCalendar ? "Yes" : "No"}</TableCell>
                    <TableCell>{(h.departments || []).join(", ") || "All"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(h)} disabled={!canEdit}>Edit</Button>
                        <Button variant="destructive" size="sm" onClick={() => h.id && deleteHoliday(h.id)} disabled={!canEdit}>Delete</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicHolidaySettings;
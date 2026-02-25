"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOvertimeRules } from "@/hooks/use-overtime-rules";
import PayrollAdminHeader from "@/components/payroll/PayrollAdminHeader";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, Save } from "lucide-react";

const OvertimeRulesPage: React.FC = () => {
  const { rules, isLoading, saveRules, refetch } = useOvertimeRules();
  const [form, setForm] = useState({
    weekdayOtMultiplier: 1.5,
    saturdayOtMultiplier: 1.5,
    sundayOtMultiplier: 2.0,
    holidayWorkedMultiplier: 2.0,
    holidayNonWorkedMultiplier: 1.5,
    nightShiftStart: "",
    nightShiftEnd: "",
    nightShiftMultiplier: 1.25,
  });

  useEffect(() => {
    if (rules) {
      setForm({
        weekdayOtMultiplier: rules.weekdayOtMultiplier ?? 1.5,
        saturdayOtMultiplier: rules.saturdayOtMultiplier ?? 1.5,
        sundayOtMultiplier: rules.sundayOtMultiplier ?? 2.0,
        holidayWorkedMultiplier: rules.holidayWorkedMultiplier ?? 2.0,
        holidayNonWorkedMultiplier: rules.holidayNonWorkedMultiplier ?? 1.5,
        nightShiftStart: rules.nightShiftStart || "",
        nightShiftEnd: rules.nightShiftEnd || "",
        nightShiftMultiplier: rules.nightShiftMultiplier ?? 1.25,
      });
    }
  }, [rules]);

  const handleSave = async () => {
    await saveRules(form);
    refetch();
  };

  return (
    <div className="space-y-4">
      <PayrollAdminHeader
        title="Overtime Rules"
        subtitle="Define overtime and holiday premium multipliers used during payroll processing."
      />

      <Card className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
        <SummaryAccent variant="sky" />
        <CardHeader>
          <CardTitle className="text-xl">Multipliers</CardTitle>
          <CardDescription>Set premium rates for different day types.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Weekday OT multiplier</Label>
              <Input
                type="number"
                step="0.01"
                value={form.weekdayOtMultiplier}
                onChange={(e) => setForm({ ...form, weekdayOtMultiplier: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label>Saturday OT multiplier</Label>
              <Input
                type="number"
                step="0.01"
                value={form.saturdayOtMultiplier}
                onChange={(e) => setForm({ ...form, saturdayOtMultiplier: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-1">
              <Label>Sunday OT multiplier</Label>
              <Input
                type="number"
                step="0.01"
                value={form.sundayOtMultiplier}
                onChange={(e) => setForm({ ...form, sundayOtMultiplier: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-1">
              <Label>Holiday worked multiplier</Label>
              <Input
                type="number"
                step="0.01"
                value={form.holidayWorkedMultiplier}
                onChange={(e) =>
                  setForm({ ...form, holidayWorkedMultiplier: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Holiday (non-worked) multiplier</Label>
              <Input
                type="number"
                step="0.01"
                value={form.holidayNonWorkedMultiplier}
                onChange={(e) =>
                  setForm({ ...form, holidayNonWorkedMultiplier: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium">Night shift premiums</div>
                <div className="text-xs text-muted-foreground">Optional time window and multiplier.</div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <Label>Night shift start (HH:MM)</Label>
                <Input value={form.nightShiftStart} onChange={(e) => setForm({ ...form, nightShiftStart: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Night shift end (HH:MM)</Label>
                <Input value={form.nightShiftEnd} onChange={(e) => setForm({ ...form, nightShiftEnd: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Night shift multiplier</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.nightShiftMultiplier}
                  onChange={(e) => setForm({ ...form, nightShiftMultiplier: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              <Save className="h-4 w-4" />
              Save rules
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OvertimeRulesPage;
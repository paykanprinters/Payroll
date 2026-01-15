"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOvertimeRules } from "@/hooks/use-overtime-rules";

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
      <Card>
        <CardHeader>
          <CardTitle>Overtime & Holiday Premium Rules</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted-foreground">Weekday OT multiplier</label>
            <Input type="number" step="0.01" value={form.weekdayOtMultiplier} onChange={(e) => setForm({ ...form, weekdayOtMultiplier: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Saturday OT multiplier</label>
            <Input type="number" step="0.01" value={form.saturdayOtMultiplier} onChange={(e) => setForm({ ...form, saturdayOtMultiplier: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Sunday OT multiplier</label>
            <Input type="number" step="0.01" value={form.sundayOtMultiplier} onChange={(e) => setForm({ ...form, sundayOtMultiplier: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Holiday worked multiplier</label>
            <Input type="number" step="0.01" value={form.holidayWorkedMultiplier} onChange={(e) => setForm({ ...form, holidayWorkedMultiplier: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Holiday non-worked multiplier</label>
            <Input type="number" step="0.01" value={form.holidayNonWorkedMultiplier} onChange={(e) => setForm({ ...form, holidayNonWorkedMultiplier: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Night shift start (HH:MM)</label>
            <Input value={form.nightShiftStart} onChange={(e) => setForm({ ...form, nightShiftStart: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Night shift end (HH:MM)</label>
            <Input value={form.nightShiftEnd} onChange={(e) => setForm({ ...form, nightShiftEnd: e.target.value })} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Night shift multiplier</label>
            <Input type="number" step="0.01" value={form.nightShiftMultiplier} onChange={(e) => setForm({ ...form, nightShiftMultiplier: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>Save Rules</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OvertimeRulesPage;
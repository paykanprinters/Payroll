"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { LeaveEntry } from "@/lib/mock-data-interfaces";
import { PAID_TIMESHEET_LEAVE_TYPES } from "@/lib/leave-timesheet-rows";

const WORKED = "worked";

interface DayTypeSelectProps {
  id: string;
  value: LeaveEntry["leaveType"] | null;
  onChange: (value: LeaveEntry["leaveType"] | null) => void;
  disabled?: boolean;
}

const DayTypeSelect: React.FC<DayTypeSelectProps> = ({ id, value, onChange, disabled }) => {
  const options = value && !PAID_TIMESHEET_LEAVE_TYPES.includes(value)
    ? [...PAID_TIMESHEET_LEAVE_TYPES, value]
    : PAID_TIMESHEET_LEAVE_TYPES;

  return (
    <div>
      <Label htmlFor={id}>Day type</Label>
      <Select
        value={value ?? WORKED}
        onValueChange={(v) => onChange(v === WORKED ? null : (v as LeaveEntry["leaveType"]))}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="mt-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={WORKED}>Worked day</SelectItem>
          {options.map((type) => (
            <SelectItem key={type} value={type}>
              {type} (paid, not worked)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DayTypeSelect;

"use client";

import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarRange, DownloadCloud, Settings2 } from "lucide-react";
import { showError, showLoading, dismissToast, showSuccess } from "@/utils/toast";
import { invokeFetchBiometricLogs } from "@/lib/fetch-biometric-logs";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import {
  biometricLogTextToTimesheetRows,
  validateBiometricTimesheetRow,
} from "@/lib/biometric-attendance-parser";
import { ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import { getStoredBiometricApiUrl } from "@/hooks/use-biometric-api-settings";

interface BiometricImportSectionProps {
  employees: MockEmployee[];
  apiUrl?: string;
  onLoaded: (
    rows: ParsedTimesheetRow[],
    punchCount: number,
    period: { start: string; end: string }
  ) => void;
  onErrors: (errors: Array<{ personalIdAttempted: string; dateAttempted: string; error: string }>) => void;
}

const BiometricImportSection: React.FC<BiometricImportSectionProps> = ({
  employees,
  apiUrl,
  onLoaded,
  onErrors,
}) => {
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [isFetching, setIsFetching] = React.useState(false);

  const resolvedApiUrl = apiUrl?.trim() || getStoredBiometricApiUrl();

  const handleFetch = async () => {
    if (!resolvedApiUrl) {
      showError("Configure the biometric API URL under Settings → Biometric API.");
      return;
    }
    if (!startDate || !endDate) {
      showError("Select a start and end date for attendance.");
      return;
    }
    if (startDate > endDate) {
      showError("Start date must be on or before end date.");
      return;
    }

    setIsFetching(true);
    const toastId = showLoading("Fetching biometric attendance logs…") as string;

    try {
      const payload = await invokeFetchBiometricLogs({
        apiUrl: resolvedApiUrl,
        startDate,
        endDate,
      });

      const logText = payload.logText || "";
      const { aggregatedRows, errors, punchCount } = biometricLogTextToTimesheetRows(
        logText,
        employees,
        startDate,
        endDate
      );

      onErrors(
        errors.map((entry) => ({
          personalIdAttempted: entry.personalIdAttempted,
          dateAttempted: entry.dateAttempted,
          error: entry.error,
        }))
      );

      const validatedRows = aggregatedRows.map((row) => validateBiometricTimesheetRow(row, employees));
      onLoaded(validatedRows, punchCount, { start: startDate, end: endDate });

      dismissToast(toastId);

      if (validatedRows.length === 0) {
        showError("No timesheet rows could be built from the attendance logs for that date range.");
      } else {
        const truncatedNote = payload.truncated ? " Response was truncated for safety." : "";
        showSuccess(
          `Loaded ${validatedRows.length} day row(s) from ${punchCount} punch(es) (${payload.lineCount ?? 0} raw log lines).${truncatedNote}`
        );
      }
    } catch (err) {
      dismissToast(toastId);
      showError(err instanceof Error ? err.message : "Failed to fetch biometric logs.");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border bg-muted/20 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <CalendarRange className="h-4 w-4 text-primary" />
            Fetch from biometric API
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Logs look like{" "}
            <code className="rounded bg-muted px-1 text-xs">
              &lt;Attendance&gt;: 3 : 2026-06-18 07:39:23 (1, 0)
            </code>
            . Clock ID <strong>3</strong> maps to the employee&apos;s <strong>Personal ID</strong>. Earliest punch =
            Time In, latest = Time Out.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" asChild>
          <Link to="/settings/biometric-api">
            <Settings2 className="h-4 w-4" />
            API settings
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bio-start-date">Attendance from (YYYY-MM-DD)</Label>
          <Input
            id="bio-start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio-end-date">Attendance to (YYYY-MM-DD)</Label>
          <Input
            id="bio-end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <Button type="button" onClick={handleFetch} disabled={isFetching}>
        <DownloadCloud className="h-4 w-4" />
        {isFetching ? "Fetching logs…" : "Fetch attendance logs"}
      </Button>
    </div>
  );
};

export default BiometricImportSection;

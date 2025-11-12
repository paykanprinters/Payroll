"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadCloud, XCircle } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { useTimesheetImport } from "@/hooks/use-timesheet-import";
import ColumnMappingSection from "./ColumnMappingSection";
import ValidatedDataTable from "./ValidatedDataTable";
import { ImportableTimesheetEntry } from "@/lib/timesheet-types";

interface InlineImportSectionProps {
  employees: MockEmployee[];
  onImport: (timesheets: ImportableTimesheetEntry[]) => void;
}

const InlineImportSection: React.FC<InlineImportSectionProps> = ({ employees, onImport }) => {
  useEffect(() => {
    console.info("[InlineImportSection] Mounted");
    return () => console.info("[InlineImportSection] Unmounted");
  }, []);

  const {
    file,
    csvHeaders,
    columnMappings,
    parsedRawData,
    validatedData,
    aggregationErrors,
    isParsing,
    allRowsValid,
    canImport,
    handleFileChange,
    handleParseFile,
    handleColumnMappingChange,
    handleRevalidate,
    reset,
  } = useTimesheetImport(employees, true);

  const handleImportData = () => {
    console.info("[InlineImportSection] Import button clicked", {
      validatedRows: validatedData.length,
      canImport,
    });
    const validEntries = validatedData.filter((row) => row._isValid);
    if (validEntries.length === 0) {
      showError("No valid timesheet entries to import.");
      return;
    }

    const timesheetsToImport: ImportableTimesheetEntry[] = validEntries.map((row) => ({
      employeeId: row.employeeId,
      date: new Date(row.date),
      timeIn: row.timeIn,
      teaStart: row.teaStart,
      teaEnd: row.teaEnd,
      lunchStart: row.lunchStart,
      lunchEnd: row.lunchEnd,
      timeOut: row.timeOut,
    }));

    console.info("[InlineImportSection] Import payload prepared", { count: timesheetsToImport.length });
    onImport(timesheetsToImport);
    showSuccess(`${timesheetsToImport.length} timesheet entries imported successfully!`);
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Clock Times (CSV)</CardTitle>
        <CardDescription>
          Upload a CSV containing employee punches. We’ll aggregate earliest as Time In and latest as Time Out per day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload and parse */}
        <div className="flex items-center space-x-2">
          <Label htmlFor="timesheet-file" className="sr-only">
            Upload CSV
          </Label>
          <input
            id="timesheet-file"
            type="file"
            accept=".csv"
            onChange={(e) => {
              console.info("[InlineImportSection] File input onChange fired");
              e.stopPropagation();
              handleFileChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
            }}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
          />
          <Button type="button" onClick={() => {
            console.info("[InlineImportSection] Parse button clicked", { hasFile: !!file });
            handleParseFile();
          }} disabled={!file || isParsing}>
            <UploadCloud className="mr-2 h-4 w-4" /> {isParsing ? "Parsing..." : "Parse File"}
          </Button>
        </div>

        {/* Column mapping */}
        <ColumnMappingSection
          csvHeaders={csvHeaders}
          columnMappings={columnMappings}
          onColumnMappingChange={(key, value) => {
            console.info("[InlineImportSection] Mapping change", { key, value });
            handleColumnMappingChange(key, value);
          }}
          onRevalidate={() => {
            console.info("[InlineImportSection] Revalidate clicked");
            handleRevalidate();
          }}
          parsedRawDataLength={parsedRawData.length}
        />

        {/* Aggregation errors */}
        {aggregationErrors.length > 0 && (
          <Card className="border-red-500 bg-red-50 text-red-800">
            <CardHeader>
              <CardTitle className="text-lg">Aggregation Errors ({aggregationErrors.length})</CardTitle>
              <CardDescription>These entries could not be processed.</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40 w-full rounded-md border p-4 bg-white text-gray-900">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {aggregationErrors.map((err, index) => (
                    <li key={index}>
                      <span className="font-semibold">Personal ID:</span> {err.personalIdAttempted || "N/A"},{" "}
                      <span className="font-semibold">Date:</span> {err.dateAttempted || "N/A"} - {err.error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Validated data */}
        {validatedData.length > 0 && (
          <>
            <ValidatedDataTable validatedData={validatedData} employees={employees} allRowsValid={allRowsValid} />
            {!allRowsValid && (
              <p className="text-sm text-red-500 mt-2">
                Some rows contain errors and will not be imported. Hover over <XCircle className="inline h-3 w-3" /> for details.
              </p>
            )}
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => {
            console.info("[InlineImportSection] Clear clicked");
            reset();
          }}>
            Clear
          </Button>
          <Button type="button" onClick={handleImportData} disabled={!canImport}>
            Import Valid Entries
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default InlineImportSection;
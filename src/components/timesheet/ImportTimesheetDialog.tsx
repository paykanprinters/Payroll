"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UploadCloud } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { useTimesheetImport } from "@/hooks/use-timesheet-import";
import ColumnMappingSection from "./ColumnMappingSection";
import ValidatedDataTable from "./ValidatedDataTable";
import { XCircle } from "lucide-react"; // Import XCircle for the error message
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea for error list
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { ImportableTimesheetEntry } from "@/lib/timesheet-types"; // Import the new type from lib/timesheet-types

interface ImportTimesheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (timesheets: ImportableTimesheetEntry[]) => void; // Use the new type
  employees: MockEmployee[];
}

const ImportTimesheetDialog: React.FC<ImportTimesheetDialogProps> = ({ isOpen, onClose, onImport, employees }) => {
  const {
    file,
    csvHeaders,
    columnMappings,
    parsedRawData,
    validatedData,
    aggregationErrors, // Get aggregation errors
    isParsing,
    allRowsValid,
    canImport,
    handleFileChange,
    handleParseFile,
    handleColumnMappingChange,
    handleRevalidate,
  } = useTimesheetImport(employees, isOpen);

  const handleImportData = () => {
    const validEntries = validatedData.filter(row => row._isValid);
    if (validEntries.length === 0) {
      showError("No valid timesheet entries to import.");
      return;
    }

    const timesheetsToImport: ImportableTimesheetEntry[] = validEntries.map(row => ({
      employeeId: row.employeeId,
      date: new Date(row.date), // Convert date string to Date object here
      timeIn: row.timeIn,
      teaStart: row.teaStart,
      teaEnd: row.teaEnd,
      lunchStart: row.lunchStart,
      lunchEnd: row.lunchEnd,
      timeOut: row.timeOut,
    }));

    console.log("ImportTimesheetDialog: Attempting to import these entries:", timesheetsToImport);
    onImport(timesheetsToImport); // Call the prop function
    showSuccess(`${timesheetsToImport.length} timesheet entries imported successfully!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        if (isParsing) {
          showError("Please wait for the file parsing to complete before closing.");
          return;
        }
        onClose();
      }
    }}>
      <DialogContent
        className="sm:max-w-[900px] max-h-[90vh] flex flex-col"
        onInteractOutside={(e) => {
          // Prevent the dialog from closing when clicking outside, or when OS file picker returns focus
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Don't allow closing with Escape while parsing
          if (isParsing) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-radix-popper-content]") || target.closest(".radix-select-content")) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Import Clock Times</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing employee clock punches. The system will automatically
            extract the earliest punch as "Time In" and the latest punch as "Time Out" for each employee per day.
            <br />
            <span className="font-semibold text-blue-600">Note:</span> "Time Out" must be strictly later than "Time In".
          </DialogDescription>
        </DialogHeader>
        
        {/* Fixed content area: File upload and column mapping */}
        <div className="flex flex-col gap-4 py-4"> {/* Removed flex-grow from this div */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="timesheet-file" className="sr-only">
              Upload CSV
            </Label>
            <Input
              id="timesheet-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex-1"
            />
            <Button onClick={handleParseFile} disabled={!file || isParsing}>
              <UploadCloud className="mr-2 h-4 w-4" /> {isParsing ? "Parsing..." : "Parse File"}
            </Button>
          </div>

          <ColumnMappingSection
            csvHeaders={csvHeaders}
            columnMappings={columnMappings}
            onColumnMappingChange={handleColumnMappingChange}
            onRevalidate={handleRevalidate}
            parsedRawDataLength={parsedRawData.length}
          />
        </div>

        {/* Aggregation Errors Section */}
        {aggregationErrors.length > 0 && (
          <Card className="border-red-500 bg-red-50 text-red-800">
            <CardHeader>
              <CardTitle className="text-lg">Aggregation Errors ({aggregationErrors.length})</CardTitle>
              <CardDescription>
                The following entries could not be processed into daily timesheets.
              </CardDescription>
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

        {/* Scrollable content area: Validated data table */}
        {validatedData.length > 0 && (
          <ValidatedDataTable
            validatedData={validatedData}
            employees={employees}
            allRowsValid={allRowsValid}
          />
        )}
        
        {/* Error message, always visible if present */}
        {validatedData.length > 0 && !allRowsValid && (
          <p className="text-sm text-red-500 mt-2">Some rows contain errors and will not be imported. Hover over <XCircle className="inline h-3 w-3" /> for details.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
          Cancel
          </Button>
          <Button onClick={handleImportData} disabled={!canImport}>
            Import Valid Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTimesheetDialog;
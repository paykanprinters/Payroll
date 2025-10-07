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
import { TimesheetEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { useTimesheetImport } from "@/hooks/use-timesheet-import";
import ColumnMappingSection from "./ColumnMappingSection";
import ValidatedDataTable from "./ValidatedDataTable";

interface ImportTimesheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (timesheets: Omit<TimesheetEntry, 'id' | 'totalWorkHours' | 'overtimeHours' | 'lateArrival' | 'earlyDeparture' | 'absent' | 'status' | 'auditLog'>[]) => void;
  employees: MockEmployee[];
}

const ImportTimesheetDialog: React.FC<ImportTimesheetDialogProps> = ({ isOpen, onClose, onImport, employees }) => {
  const {
    file,
    csvHeaders,
    columnMappings,
    parsedRawData,
    validatedData,
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

    const timesheetsToImport = validEntries.map(row => ({
      employeeId: row.employeeId,
      date: row.date,
      timeIn: row.timeIn,
      teaStart: row.teaStart,
      teaEnd: row.teaEnd,
      lunchStart: row.lunchStart,
      lunchEnd: row.lunchEnd,
      timeOut: row.timeOut,
    }));

    onImport(timesheetsToImport);
    showSuccess(`${timesheetsToImport.length} timesheet entries imported successfully!`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[900px] max-h-[90vh] flex flex-col"
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
        <div className="flex flex-col gap-4 py-4 flex-grow">
          <div className="flex items-center space-x-2">
            <Label htmlFor="timesheet-file" className="sr-only">
              Upload CSV
            </Label>
            <Input
              id="timesheet-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
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

          <ValidatedDataTable
            validatedData={validatedData}
            employees={employees}
            allRowsValid={allRowsValid}
          />
        </div>
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
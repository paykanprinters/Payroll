"use client";

import React, { useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UploadCloud, CheckCircle, XCircle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import Papa from "papaparse";
import { TimesheetEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { format, parse, isValid } from "date-fns";

interface ImportTimesheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (timesheets: Omit<TimesheetEntry, 'id' | 'totalWorkHours' | 'overtimeHours' | 'lateArrival' | 'earlyDeparture' | 'absent' | 'status' | 'auditLog'>[]) => void;
  employees: MockEmployee[];
}

interface ParsedTimesheetRow {
  employeeId: string;
  date: string;
  timeIn: string;
  teaStart?: string;
  teaEnd?: string;
  lunchStart?: string;
  lunchEnd?: string;
  timeOut: string;
  _isValid: boolean;
  _errors: string[];
}

const ImportTimesheetDialog: React.FC<ImportTimesheetDialogProps> = ({ isOpen, onClose, onImport, employees }) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedTimesheetRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParsedData([]); // Clear previous data
    } else {
      setFile(null);
    }
  };

  const validateRow = (row: any): ParsedTimesheetRow => {
    const errors: string[] = [];
    const employeeId = String(row.employeeId || "").trim();
    const date = String(row.date || "").trim();
    const timeIn = String(row.timeIn || "").trim();
    const timeOut = String(row.timeOut || "").trim();

    if (!employeeId) errors.push("Employee ID is required.");
    if (!employees.some(emp => emp.id === employeeId)) errors.push("Employee ID not found.");
    
    const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (!date || !isValid(parsedDate)) errors.push("Valid Date (YYYY-MM-DD) is required.");

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeIn || !timeRegex.test(timeIn)) errors.push("Valid Time In (HH:mm) is required.");
    if (!timeOut || !timeRegex.test(timeOut)) errors.push("Valid Time Out (HH:mm) is required.");

    // Optional time validations
    const validateOptionalTime = (time: string | undefined, fieldName: string) => {
      if (time && !timeRegex.test(time)) errors.push(`Valid ${fieldName} (HH:mm) is required.`);
    };
    validateOptionalTime(String(row.teaStart || "").trim(), "Tea Start");
    validateOptionalTime(String(row.teaEnd || "").trim(), "Tea End");
    validateOptionalTime(String(row.lunchStart || "").trim(), "Lunch Start");
    validateOptionalTime(String(row.lunchEnd || "").trim(), "Lunch End");

    return {
      employeeId,
      date,
      timeIn,
      teaStart: String(row.teaStart || "").trim() || undefined,
      teaEnd: String(row.teaEnd || "").trim() || undefined,
      lunchStart: String(row.lunchStart || "").trim() || undefined,
      lunchEnd: String(row.lunchEnd || "").trim() || undefined,
      timeOut,
      _isValid: errors.length === 0,
      _errors: errors,
    };
  };

  const handleParseFile = () => {
    if (!file) {
      showError("Please select a CSV file to import.");
      return;
    }

    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const validatedData = results.data.map(row => validateRow(row));
        setParsedData(validatedData);
        setIsParsing(false);
        if (results.errors.length > 0) {
          showError(`CSV parsing completed with ${results.errors.length} errors. Check console for details.`);
          console.error("CSV Parsing Errors:", results.errors);
        } else {
          showSuccess("File parsed successfully. Please review entries.");
        }
      },
      error: (error) => {
        setIsParsing(false);
        showError(`Error parsing file: ${error.message}`);
        console.error("PapaParse Error:", error);
      },
    });
  };

  const handleImportData = () => {
    const validEntries = parsedData.filter(row => row._isValid);
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
    setFile(null);
    setParsedData([]);
    onClose();
  };

  const allRowsValid = parsedData.length > 0 && parsedData.every(row => row._isValid);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Clock Times</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing employee clock-in/out times.
            <p className="text-xs text-muted-foreground mt-1">
              Expected CSV columns: `employeeId`, `date` (YYYY-MM-DD), `timeIn` (HH:mm), `timeOut` (HH:mm), `teaStart` (HH:mm, optional), `teaEnd` (HH:mm, optional), `lunchStart` (HH:mm, optional), `lunchEnd` (HH:mm, optional).
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4 flex-grow">
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

          {parsedData.length > 0 && (
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Tea Break</TableHead>
                    <TableHead>Lunch Break</TableHead>
                    <TableHead>Time Out</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((row, index) => (
                    <TableRow key={index} className={!row._isValid ? "bg-red-50/50" : ""}>
                      <TableCell>{row.employeeId}</TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.timeIn}</TableCell>
                      <TableCell>{row.teaStart && row.teaEnd ? `${row.teaStart}-${row.teaEnd}` : "N/A"}</TableCell>
                      <TableCell>{row.lunchStart && row.lunchEnd ? `${row.lunchStart}-${row.lunchEnd}` : "N/A"}</TableCell>
                      <TableCell>{row.timeOut}</TableCell>
                      <TableCell className="text-center">
                        {row._isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center text-red-500" title={row._errors.join("; ")}>
                            <XCircle className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {parsedData.length > 0 && !allRowsValid && (
            <p className="text-sm text-red-500">Some rows contain errors and will not be imported. Hover over <XCircle className="inline h-3 w-3" /> for details.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImportData} disabled={parsedData.length === 0 || !allRowsValid}>
            Import Valid Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTimesheetDialog;
"use client";

import React, { useState, useEffect } from "react";
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
import { UploadCloud, CheckCircle, XCircle, RefreshCcw } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import Papa from "papaparse";
import { TimesheetEntry, MockEmployee } from "@/lib/mock-data-interfaces";
import { format, parse, isValid, isAfter } from "date-fns"; // Import isAfter
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

interface ImportTimesheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (timesheets: Omit<TimesheetEntry, 'id' | 'totalWorkHours' | 'overtimeHours' | 'lateArrival' | 'earlyDeparture' | 'absent' | 'status' | 'auditLog'>[]) => void;
  employees: MockEmployee[];
}

interface ParsedTimesheetRow {
  employeeId: string; // This will be the internal employee.id (e.g., EMP001)
  csvPersonalId: string; // The personal ID from the CSV (e.g., BIO1001)
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

// Define required fields and their display names, now including 'personalId' for matching
const requiredFields = [
  { key: "personalId", label: "Personal ID (from Report)" },
  { key: "date", label: "Date" },
  { key: "timeIn", label: "Time In" },
  { key: "timeOut", label: "Time Out" },
];

const optionalFields = [
  { key: "teaStart", label: "Tea Start" },
  { key: "teaEnd", label: "Tea End" },
  { key: "lunchStart", label: "Lunch Start" },
  { key: "lunchEnd", label: "Lunch End" },
];

type ColumnMappings = { [key: string]: string | undefined };

// Helper to extract date and time parts from a combined string (e.g., "YYYY-MM-DD HH:mm")
const extractDateAndTimeParts = (value: string) => {
  const dateRegex = /(\d{4}-\d{2}-\d{2})/; // YYYY-MM-DD
  const timeRegex = /(\d{2}:\d{2})/; // HH:mm

  const dateMatch = value.match(dateRegex);
  const timeMatch = value.match(timeRegex);

  return {
    datePart: dateMatch ? dateMatch[1] : undefined,
    timePart: timeMatch ? timeMatch[1] : undefined,
  };
};

const ImportTimesheetDialog: React.FC<ImportTimesheetDialogProps> = ({ isOpen, onClose, onImport, employees }) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMappings>(() => {
    const initialMappings: ColumnMappings = {};
    [...requiredFields, ...optionalFields].forEach(field => {
      initialMappings[field.key] = undefined;
    });
    return initialMappings;
  });
  const [parsedRawData, setParsedRawData] = useState<any[]>([]);
  const [validatedData, setValidatedData] = useState<ParsedTimesheetRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCsvHeaders([]);
      setColumnMappings({});
      setParsedRawData([]);
      setValidatedData([]);
    } else {
      const initialMappings: ColumnMappings = {};
      [...requiredFields, ...optionalFields].forEach(field => {
        initialMappings[field.key] = undefined;
      });
      setColumnMappings(initialMappings);
    }
  }, [isOpen]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCsvHeaders([]);
      setColumnMappings({});
      setParsedRawData([]);
      setValidatedData([]);
    } else {
      setFile(null);
    }
  };

  const autoMapColumns = (headers: string[]) => {
    const newMappings: ColumnMappings = {};
    [...requiredFields, ...optionalFields].forEach(field => {
      const commonNames = [
        field.label,
        field.key,
        field.label.replace(/\s/g, ''), // e.g., PersonalID
        field.label.toLowerCase(),
        field.key.toLowerCase(),
        // Add more common variations for personal ID
        "employeeid", "employee_id", "clockid", "clock_id", "id", "staffid", "staff_id",
        // Common names for combined date/time fields
        "timestamp", "datetime", "clocktime", "time"
      ];
      const foundHeader = headers.find(header => commonNames.includes(header.trim().toLowerCase()));
      if (foundHeader) {
        newMappings[field.key] = foundHeader.trim();
      }
    });
    setColumnMappings(prev => ({ ...prev, ...newMappings }));
  };

  const parseAndValidate = (data: any[], currentMappings: ColumnMappings) => {
    const validated = data.map(row => validateRow(row, currentMappings));
    setValidatedData(validated);
    if (validated.some(row => !row._isValid)) {
      showError("Some rows contain errors. Please review the table below.");
    } else if (validated.length > 0) {
      showSuccess("All entries appear valid. Ready to import!");
    }
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
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setParsedRawData(results.data);
        autoMapColumns(headers); // Attempt to auto-map
        // Use the updated columnMappings for initial validation
        parseAndValidate(results.data, columnMappings); 
        setIsParsing(false);
        if (results.errors.length > 0) {
          showError(`CSV parsing completed with ${results.errors.length} errors. Check console for details.`);
          console.error("CSV Parsing Errors:", results.errors);
        } else {
          showSuccess("File parsed successfully. Please review entries and mappings.");
        }
      },
      error: (error) => {
        setIsParsing(false);
        showError(`Error parsing file: ${error.message}`);
        console.error("PapaParse Error:", error);
      },
    });
  };

  const validateRow = (row: any, currentMappings: ColumnMappings): ParsedTimesheetRow => {
    const errors: string[] = [];

    const getRawMappedValue = (key: string) => {
      const mappedColumn = currentMappings[key];
      return mappedColumn ? String(row[mappedColumn] || "").trim() : "";
    };

    const csvPersonalId = getRawMappedValue("personalId");
    let resolvedEmployeeId = "";

    // Validate Personal ID and resolve internal employeeId
    if (!csvPersonalId) {
      errors.push("Personal ID is required.");
    } else {
      const matchingEmployee = employees.find(emp => emp.personalId === csvPersonalId);
      if (matchingEmployee) {
        resolvedEmployeeId = matchingEmployee.id;
      } else {
        errors.push(`Personal ID '${csvPersonalId}' not found in employee records.`);
      }
    }

    // Raw values from CSV, potentially combined date/time
    const rawDate = getRawMappedValue("date");
    const rawTimeIn = getRawMappedValue("timeIn");
    const rawTimeOut = getRawMappedValue("timeOut");
    const rawTeaStart = getRawMappedValue("teaStart");
    const rawTeaEnd = getRawMappedValue("teaEnd");
    const rawLunchStart = getRawMappedValue("lunchStart");
    const rawLunchEnd = getRawMappedValue("lunchEnd");

    // Final parsed values for the timesheet entry
    let finalDate: string | undefined;
    let finalTimeIn: string | undefined;
    let finalTimeOut: string | undefined;
    let finalTeaStart: string | undefined;
    let finalTeaEnd: string | undefined;
    let finalLunchStart: string | undefined;
    let finalLunchEnd: string | undefined;

    // Prioritize date extraction: from 'date' column, then 'timeIn', then 'timeOut'
    if (rawDate) {
      finalDate = extractDateAndTimeParts(rawDate).datePart || rawDate;
    }
    if (!finalDate && rawTimeIn) {
      finalDate = extractDateAndTimeParts(rawTimeIn).datePart;
    }
    if (!finalDate && rawTimeOut) {
      finalDate = extractDateAndTimeParts(rawTimeOut).datePart;
    }

    // Extract time parts
    if (rawTimeIn) {
      finalTimeIn = extractDateAndTimeParts(rawTimeIn).timePart || rawTimeIn;
    }
    if (rawTimeOut) {
      finalTimeOut = extractDateAndTimeParts(rawTimeOut).timePart || rawTimeOut;
    }
    if (rawTeaStart) {
      finalTeaStart = extractDateAndTimeParts(rawTeaStart).timePart || rawTeaStart;
    }
    if (rawTeaEnd) {
      finalTeaEnd = extractDateAndTimeParts(rawTeaEnd).timePart || rawTeaEnd;
    }
    if (rawLunchStart) {
      finalLunchStart = extractDateAndTimeParts(rawLunchStart).timePart || rawLunchStart;
    }
    if (rawLunchEnd) {
      finalLunchEnd = extractDateAndTimeParts(rawLunchEnd).timePart || rawLunchEnd;
    }

    // Date validation
    if (!finalDate || !isValid(parse(finalDate, 'yyyy-MM-dd', new Date()))) errors.push("Valid Date (YYYY-MM-DD) is required.");

    // Time validations
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!finalTimeIn || !timeRegex.test(finalTimeIn)) errors.push("Valid Time In (HH:mm) is required.");
    if (!finalTimeOut || !timeRegex.test(finalTimeOut)) errors.push("Valid Time Out (HH:mm) is required.");

    // New validation: Ensure Time Out is not before Time In, and not the same as Time In
    if (finalTimeIn && finalTimeOut && timeRegex.test(finalTimeIn) && timeRegex.test(finalTimeOut)) {
      const timeInDateObj = parse(finalTimeIn, 'HH:mm', new Date());
      const timeOutDateObj = parse(finalTimeOut, 'HH:mm', new Date());

      if (isAfter(timeInDateObj, timeOutDateObj)) {
        errors.push("Time Out cannot be before Time In.");
      } else if (timeInDateObj.getTime() === timeOutDateObj.getTime()) { // Explicit check for equality
        errors.push("Time In and Time Out cannot be the same.");
      }
    }

    const validateOptionalTimePair = (start: string | undefined, end: string | undefined, startName: string, endName: string) => {
      if ((start && !timeRegex.test(start)) || (end && !timeRegex.test(end))) {
        errors.push(`Valid ${startName} and ${endName} (HH:mm) are required if provided.`);
      } else if ((start && !end) || (!start && end)) {
        errors.push(`Both ${startName} and ${endName} are required if one is provided.`);
      }
    };
    validateOptionalTimePair(finalTeaStart, finalTeaEnd, "Tea Start", "Tea End");
    validateOptionalTimePair(finalLunchStart, finalLunchEnd, "Lunch Start", "Lunch End");

    return {
      employeeId: resolvedEmployeeId,
      csvPersonalId: csvPersonalId,
      date: finalDate || "", // Ensure it's a string
      timeIn: finalTimeIn || "", // Ensure it's a string
      teaStart: finalTeaStart,
      teaEnd: finalTeaEnd,
      lunchStart: finalLunchStart,
      lunchEnd: finalLunchEnd,
      timeOut: finalTimeOut || "", // Ensure it's a string
      _isValid: errors.length === 0,
      _errors: errors,
    };
  };

  const handleColumnMappingChange = (key: string, value: string) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev, [key]: value === "none" ? undefined : value };
      if (parsedRawData.length > 0) {
        parseAndValidate(parsedRawData, newMappings);
      }
      return newMappings;
    });
  };

  const handleRevalidate = () => {
    if (parsedRawData.length > 0) {
      parseAndValidate(parsedRawData, columnMappings);
    } else {
      showError("No data parsed yet. Please upload and parse a file first.");
    }
  };

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

  const allRowsValid = validatedData.length > 0 && validatedData.every(row => row._isValid);
  const canImport = validatedData.length > 0 && allRowsValid;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Clock Times</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing employee clock-in/out times and map the columns.
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

          {csvHeaders.length > 0 && (
            <>
              <Separator />
              <h3 className="text-md font-semibold">Column Mapping</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...requiredFields, ...optionalFields].map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label htmlFor={`map-${field.key}`}>{field.label}</Label>
                    <Select
                      onValueChange={(value) => handleColumnMappingChange(field.key, value)}
                      value={columnMappings[field.key] || "none"}
                    >
                      <SelectTrigger id={`map-${field.key}`}>
                        <SelectValue placeholder={`Select ${field.label} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {csvHeaders.map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <Button onClick={handleRevalidate} variant="outline" disabled={parsedRawData.length === 0}>
                <RefreshCcw className="mr-2 h-4 w-4" /> Re-validate with Mappings
              </Button>
              <Separator />
            </>
          )}

          {validatedData.length > 0 && (
            <ScrollArea className="h-[300px] border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Personal ID (from CSV)</TableHead>
                    <TableHead>Employee Name (Resolved)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Tea Break</TableHead>
                    <TableHead>Lunch Break</TableHead>
                    <TableHead>Time Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedData.map((row, index) => (
                    <TableRow key={index} className={!row._isValid ? "bg-red-50/50" : ""}>
                      <TableCell className="text-center">
                        {row._isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center text-red-500" title={row._errors.join("; ")}>
                            <XCircle className="h-4 w-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{row.csvPersonalId}</TableCell>
                      <TableCell>
                        {employees.find(emp => emp.id === row.employeeId)?.firstName}{" "}
                        {employees.find(emp => emp.id === row.employeeId)?.lastName || "N/A"}
                      </TableCell>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.timeIn}</TableCell>
                      <TableCell>{row.teaStart && row.teaEnd ? `${row.teaStart}-${row.teaEnd}` : "N/A"}</TableCell>
                      <TableCell>{row.lunchStart && row.lunchEnd ? `${row.lunchStart}-${row.lunchEnd}` : "N/A"}</TableCell>
                      <TableCell>{row.timeOut}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          {validatedData.length > 0 && !allRowsValid && (
            <p className="text-sm text-red-500">Some rows contain errors and will not be imported. Hover over <XCircle className="inline h-3 w-3" /> for details.</p>
          )}
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
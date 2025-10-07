"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { format, parse, isValid, isAfter, min, max } from "date-fns"; // Added min, max
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

// Define fields for mapping from CSV. 'timeIn' and 'timeOut' are now derived.
const requiredFields = [
  { key: "personalId", label: "Personal ID (from Report)" },
  { key: "combinedDateTime", label: "Date And Time (from Report)" }, // New field for mapping
];

const optionalFields = [
  // These will remain optional, assuming they might be in separate columns if needed,
  // or will be left blank if only combinedDateTime is available.
  { key: "teaStart", label: "Tea Start" },
  { key: "teaEnd", label: "Tea End" },
  { key: "lunchStart", label: "Lunch Start" },
  { key: "lunchEnd", label: "Lunch End" },
];

type ColumnMappings = { [key: string]: string | undefined };

// Helper to extract date and time parts from a combined string (e.g., "YYYY-MM-DD HH:mm:ss")
const extractDateAndTimeParts = (value: string) => {
  // Regex to capture YYYY-MM-DD and HH:mm (ignoring seconds for time part)
  // Added optional seconds part to handle "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
  const dateTimeRegex = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/;
  const match = value.match(dateTimeRegex);

  return {
    datePart: match ? match[1] : undefined,
    timePart: match ? match[2] : undefined,
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
  const [aggregatedData, setAggregatedData] = useState<ParsedTimesheetRow[]>([]); // New state for aggregated data
  const [validatedData, setValidatedData] = useState<ParsedTimesheetRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCsvHeaders([]);
      setColumnMappings({});
      setParsedRawData([]);
      setAggregatedData([]);
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
      setAggregatedData([]);
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
        // Specific common names for 'personalId'
        "employeeid", "employee_id", "clockid", "clock_id", "id", "staffid", "staff_id",
        // Specific common names for 'combinedDateTime'
        "dateandtime", "timestamp", "datetime", "clocktime", "time", "punchtime"
      ];
      const foundHeader = headers.find(header => commonNames.includes(header.trim().toLowerCase()));
      if (foundHeader) {
        newMappings[field.key] = foundHeader.trim();
      }
    });
    setColumnMappings(prev => ({ ...prev, ...newMappings }));
  };

  const aggregateClockTimes = useCallback((data: any[], currentMappings: ColumnMappings): ParsedTimesheetRow[] => {
    const employeeDailyPunches = new Map<string, Map<string, Date[]>>();
    const aggregationErrors: { personalId: string; date: string; error: string }[] = [];

    // CRITICAL: Check if required mappings are present before attempting to access row properties
    if (!currentMappings.personalId || !currentMappings.combinedDateTime) {
      aggregationErrors.push({ personalId: "N/A", date: "N/A", error: "Required columns for Personal ID and Date And Time are not mapped. Please select them from the dropdowns." });
      // If required mappings are missing, we cannot proceed with aggregation.
      return [];
    }

    data.forEach(row => {
      // Safely get values, defaulting to empty string if property is missing
      const csvPersonalId = String(row[currentMappings.personalId] || "").trim();
      const rawCombinedDateTime = String(row[currentMappings.combinedDateTime] || "").trim();

      if (!csvPersonalId) {
        aggregationErrors.push({ personalId: "N/A", date: "N/A", error: `Skipped row: Missing Personal ID in row: ${JSON.stringify(row)}` });
        return;
      }
      if (!rawCombinedDateTime) {
        aggregationErrors.push({ personalId: csvPersonalId, date: "N/A", error: `Skipped row: Missing Date And Time for Personal ID '${csvPersonalId}'` });
        return;
      }

      const matchingEmployee = employees.find(emp => emp.personalId === csvPersonalId);
      if (!matchingEmployee) {
        aggregationErrors.push({ personalId: csvPersonalId, date: "N/A", error: `Personal ID '${csvPersonalId}' not found in employee records. Ensure employee exists and has a 'Personal ID' set.` });
        return;
      }

      const { datePart, timePart } = extractDateAndTimeParts(rawCombinedDateTime);

      if (!datePart || !timePart) {
        aggregationErrors.push({ personalId: csvPersonalId, date: datePart || "N/A", error: `Invalid date/time format for '${rawCombinedDateTime}'. Expected YYYY-MM-DD HH:mm.` });
        return;
      }

      const punchDateTime = parse(`${datePart} ${timePart}`, 'yyyy-MM-dd HH:mm', new Date());
      if (!isValid(punchDateTime)) {
        aggregationErrors.push({ personalId: csvPersonalId, date: datePart, error: `Could not parse date/time '${rawCombinedDateTime}'.` });
        return;
      }

      if (!employeeDailyPunches.has(matchingEmployee.id)) {
        employeeDailyPunches.set(matchingEmployee.id, new Map());
      }
      const dailyPunches = employeeDailyPunches.get(matchingEmployee.id)!;

      if (!dailyPunches.has(datePart)) {
        dailyPunches.set(datePart, []);
      }
      dailyPunches.get(datePart)!.push(punchDateTime);
    });

    const aggregatedRows: ParsedTimesheetRow[] = [];
    employeeDailyPunches.forEach((dailyPunchesMap, employeeId) => {
      dailyPunchesMap.forEach((punches, date) => {
        if (punches.length > 0) {
          const earliestPunch = min(punches);
          const latestPunch = max(punches);

          const timeIn = format(earliestPunch, 'HH:mm');
          const timeOut = format(latestPunch, 'HH:mm');

          // Find a representative row from the raw data for this employee and date
          // to extract optional fields if they are mapped.
          const employeePersonalId = employees.find(e => e.id === employeeId)?.personalId;
          const sampleRowForOptionalFields = data.find(r => {
            const rowPersonalId = currentMappings.personalId ? String(r[currentMappings.personalId] || "").trim() : "";
            const rowCombinedDateTime = currentMappings.combinedDateTime ? String(r[currentMappings.combinedDateTime] || "").trim() : "";
            const { datePart: rowDatePart } = extractDateAndTimeParts(rowCombinedDateTime);
            return rowPersonalId === employeePersonalId && rowDatePart === date;
          });

          const teaStart = currentMappings.teaStart && sampleRowForOptionalFields ? String(sampleRowForOptionalFields[currentMappings.teaStart] || "").trim() : undefined;
          const teaEnd = currentMappings.teaEnd && sampleRowForOptionalFields ? String(sampleRowForOptionalFields[currentMappings.teaEnd] || "").trim() : undefined;
          const lunchStart = currentMappings.lunchStart && sampleRowForOptionalFields ? String(sampleRowForOptionalFields[currentMappings.lunchStart] || "").trim() : undefined;
          const lunchEnd = currentMappings.lunchEnd && sampleRowForOptionalFields ? String(sampleRowForOptionalFields[currentMappings.lunchEnd] || "").trim() : undefined;

          aggregatedRows.push({
            employeeId: employeeId,
            csvPersonalId: employeePersonalId || "Unknown",
            date: date,
            timeIn: timeIn,
            teaStart: teaStart || undefined,
            teaEnd: teaEnd || undefined,
            lunchStart: lunchStart || undefined,
            lunchEnd: lunchEnd || undefined,
            timeOut: timeOut,
            _isValid: true, // Will be re-validated by validateRow
            _errors: [],
          });
        }
      });
    });

    if (aggregationErrors.length > 0) {
      console.warn("Timesheet aggregation warnings/errors:", aggregationErrors);
      // Only show a general error if there are actual errors, not just if the initial check failed
      if (aggregationErrors.some(e => e.error !== "Required columns for Personal ID and Date And Time are not mapped.")) {
        showError(`Some entries could not be aggregated due to missing data or invalid format. See console for details.`);
      }
    }

    return aggregatedRows;
  }, [employees]);

  const parseAndValidateData = useCallback((data: any[], currentMappings: ColumnMappings) => {
    const aggregated = aggregateClockTimes(data, currentMappings);
    setAggregatedData(aggregated); // Store aggregated data
    const validated = aggregated.map(row => validateRow(row, currentMappings));
    setValidatedData(validated);
    if (validated.some(row => !row._isValid)) {
      showError("Some rows contain errors after aggregation. Please review the table below.");
    } else if (validated.length > 0) {
      showSuccess("All entries appear valid. Ready to import!");
    }
  }, [aggregateClockTimes]);

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
        // Initial validation after parsing and auto-mapping
        parseAndValidateData(results.data, columnMappings);
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

  const validateRow = (row: ParsedTimesheetRow, currentMappings: ColumnMappings): ParsedTimesheetRow => {
    const errors: string[] = [];

    // Employee ID should already be resolved from aggregation
    if (!row.employeeId || row.employeeId === "Unknown") {
      errors.push(`Personal ID '${row.csvPersonalId}' not found in employee records.`);
    }

    // Date validation
    if (!row.date || !isValid(parse(row.date, 'yyyy-MM-dd', new Date()))) errors.push("Valid Date (YYYY-MM-DD) is required.");

    // Time validations
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!row.timeIn || !timeRegex.test(row.timeIn)) errors.push("Valid Time In (HH:mm) is required.");
    if (!row.timeOut || !timeRegex.test(row.timeOut)) errors.push("Valid Time Out (HH:mm) is required.");

    // Ensure Time Out is strictly after Time In
    if (row.timeIn && row.timeOut && timeRegex.test(row.timeIn) && timeRegex.test(row.timeOut)) {
      const timeInDateObj = parse(row.timeIn, 'HH:mm', new Date());
      const timeOutDateObj = parse(row.timeOut, 'HH:mm', new Date());

      if (!isAfter(timeOutDateObj, timeInDateObj)) {
        errors.push("Time Out must be strictly after Time In.");
      }
    }

    const validateOptionalTimePair = (start: string | undefined, end: string | undefined, startName: string, endName: string) => {
      if ((start && !timeRegex.test(start)) || (end && !timeRegex.test(end))) {
        errors.push(`Valid ${startName} and ${endName} (HH:mm) are required if provided.`);
      } else if ((start && !end) || (!start && end)) {
        errors.push(`Both ${startName} and ${endName} are required if one is provided.`);
      }
    };
    validateOptionalTimePair(row.teaStart, row.teaEnd, "Tea Start", "Tea End");
    validateOptionalTimePair(row.lunchStart, row.lunchEnd, "Lunch Start", "Lunch End");

    return {
      ...row,
      _isValid: errors.length === 0,
      _errors: errors,
    };
  };

  const handleColumnMappingChange = (key: string, value: string) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev, [key]: value === "none" ? undefined : value };
      if (parsedRawData.length > 0) {
        // Re-parse and validate with new mappings
        parseAndValidateData(parsedRawData, newMappings);
      }
      return newMappings;
    });
  };

  const handleRevalidate = () => {
    if (parsedRawData.length > 0) {
      parseAndValidateData(parsedRawData, columnMappings);
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
      <DialogContent 
        className="sm:max-w-[900px] max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          // Prevent dialog from closing if the click is inside a Select dropdown
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
            <ScrollArea className="border rounded-md flex-grow">
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
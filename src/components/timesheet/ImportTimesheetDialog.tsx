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
import { format, parse, isValid } from "date-fns";
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
  { key: "personalId", label: "Personal ID (from Report)" }, // Changed to personalId
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
        "employeeid", "employee_id", "clockid", "clock_id", "id", "staffid", "staff_id"
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

    const getMappedValue = (key: string) => {
      const mappedColumn = currentMappings[key];
      return mappedColumn ? String(row[mappedColumn] || "").trim() : "";
    };

    const csvPersonalId = getMappedValue("personalId"); // Get the personal ID from CSV
    let resolvedEmployeeId = ""; // Initialize resolved internal employee ID

    // Validate Personal ID and resolve internal employeeId
    if (!csvPersonalId) {
      errors.push("Personal ID is required.");
    } else {
      const matchingEmployee = employees.find(emp => emp.personalId === csvPersonalId);
      if (matchingEmployee) {
        resolvedEmployeeId = matchingEmployee.id; // Found a match, use internal ID
      } else {
        errors.push(`Personal ID '${csvPersonalId}' not found in employee records.`);
      }
    }

    const date = getMappedValue("date");
    const timeIn = getMappedValue("timeIn");
    const timeOut = getMappedValue("timeOut");
    const teaStart = getMappedValue("teaStart");
    const teaEnd = getMappedValue("teaEnd");
    const lunchStart = getMappedValue("lunchStart");
    const lunchEnd = getMappedValue("lunchEnd");

    // Date validation
    const parsedDate = parse(date, 'yyyy-MM-dd', new Date());
    if (!date || !isValid(parsedDate)) errors.push("Valid Date (YYYY-MM-DD) is required.");

    // Time validations
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeIn || !timeRegex.test(timeIn)) errors.push("Valid Time In (HH:mm) is required.");
    if (!timeOut || !timeRegex.test(timeOut)) errors.push("Valid Time Out (HH:mm) is required.");

    const validateOptionalTimePair = (start: string, end: string, startName: string, endName: string) => {
      if ((start && !timeRegex.test(start)) || (end && !timeRegex.test(end))) {
        errors.push(`Valid ${startName} and ${endName} (HH:mm) are required if provided.`);
      } else if ((start && !end) || (!start && end)) {
        errors.push(`Both ${startName} and ${endName} are required if one is provided.`);
      }
    };
    validateOptionalTimePair(teaStart, teaEnd, "Tea Start", "Tea End");
    validateOptionalTimePair(lunchStart, lunchEnd, "Lunch Start", "Lunch End");

    return {
      employeeId: resolvedEmployeeId, // Use the resolved internal ID
      csvPersonalId: csvPersonalId, // Keep CSV personal ID for display
      date,
      timeIn,
      teaStart: teaStart || undefined,
      teaEnd: teaEnd || undefined,
      lunchStart: lunchStart || undefined,
      lunchEnd: lunchEnd || undefined,
      timeOut,
      _isValid: errors.length === 0,
      _errors: errors,
    };
  };

  const handleColumnMappingChange = (key: string, value: string) => {
    // If "none" is selected, set the mapping to undefined
    setColumnMappings(prev => {
      const newMappings = { ...prev, [key]: value === "none" ? undefined : value };
      // Re-validate data immediately after mapping changes
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
      employeeId: row.employeeId, // Use the resolved internal employeeId
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
                      value={columnMappings[field.key] || "none"} // Set default to "none"
                    >
                      <SelectTrigger id={`map-${field.key}`}>
                        <SelectValue placeholder={`Select ${field.label} column`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem> {/* Added "None" option */}
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
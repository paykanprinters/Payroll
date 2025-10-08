"use client";

import React, { useState, useEffect, useCallback } from "react";
import Papa from "papaparse";
import { format, parse, isValid, isAfter, min, max } from "date-fns";
import { MockEmployee, TimesheetEntry } from "@/lib/mock-data-interfaces";
import { showError, showSuccess } from "@/utils/toast";

// Define fields for mapping from CSV. 'timeIn' and 'timeOut' are now derived.
export const requiredFields = [
  { key: "personalId", label: "Personal ID (from Report)" },
  { key: "combinedDateTime", label: "Date And Time (from Report)" },
];

export const optionalFields = [
  { key: "teaStart", label: "Tea Start" },
  { key: "teaEnd", label: "Tea End" },
  { key: "lunchStart", label: "Lunch Start" },
  { key: "lunchEnd", label: "Lunch End" },
];

export type ColumnMappings = { [key: string]: string | undefined };

export interface ParsedTimesheetRow {
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

export interface AggregationError {
  originalRow: any; // The raw CSV row that caused the error
  personalIdAttempted: string;
  dateAttempted: string;
  error: string;
}

// Helper to extract date and time parts from a combined string (e.g., "YYYY-MM-DD HH:mm:ss")
const extractDateAndTimeParts = (value: string) => {
  // This regex handles both "YYYY-MM-DD HH:mm:ss" and "YYYY-MM-DD HH:mm"
  const dateTimeRegex = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/;
  const match = value.match(dateTimeRegex);

  return {
    datePart: match ? match[1] : undefined,
    timePart: match ? match[2] : undefined,
  };
};

export const useTimesheetImport = (employees: MockEmployee[], isOpen: boolean) => {
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
  const [aggregatedData, setAggregatedData] = useState<ParsedTimesheetRow[]>([]);
  const [validatedData, setValidatedData] = useState<ParsedTimesheetRow[]>([]);
  const [aggregationErrors, setAggregationErrors] = useState<AggregationError[]>([]); // New state for aggregation errors
  const [isParsing, setIsParsing] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setCsvHeaders([]);
      setColumnMappings(() => {
        const initialMappings: ColumnMappings = {};
        [...requiredFields, ...optionalFields].forEach(field => {
          initialMappings[field.key] = undefined;
        });
        return initialMappings;
      });
      setParsedRawData([]);
      setAggregatedData([]);
      setValidatedData([]);
      setAggregationErrors([]); // Reset aggregation errors
    }
  }, [isOpen]);

  const autoMapColumns = useCallback((headers: string[]) => {
    const newMappings: ColumnMappings = {};
    [...requiredFields, ...optionalFields].forEach(field => {
      const commonNames = [
        field.label,
        field.key,
        field.label.replace(/\s/g, ''),
        field.label.toLowerCase(),
        field.key.toLowerCase(),
        "employeeid", "employee_id", "clockid", "clock_id", "id", "staffid", "staff_id",
        "dateandtime", "timestamp", "datetime", "clocktime", "time", "punchtime"
      ];
      const foundHeader = headers.find(header => commonNames.includes(header.trim().toLowerCase()));
      if (foundHeader) {
        newMappings[field.key] = foundHeader.trim();
      }
    });
    setColumnMappings(prev => ({ ...prev, ...newMappings }));
  }, []);

  const validateRow = useCallback((row: ParsedTimesheetRow): ParsedTimesheetRow => {
    const errors: string[] = [];

    if (!row.employeeId || row.employeeId === "Unknown") {
      errors.push(`Personal ID '${row.csvPersonalId}' not found in employee records.`);
    }

    if (!row.date || !isValid(parse(row.date, 'yyyy-MM-dd', new Date()))) errors.push("Valid Date (YYYY-MM-DD) is required.");

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!row.timeIn || !timeRegex.test(row.timeIn)) errors.push("Valid Time In (HH:mm) is required.");
    if (!row.timeOut || !timeRegex.test(row.timeOut)) errors.push("Valid Time Out (HH:mm) is required.");

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
  }, []);

  const aggregateClockTimes = useCallback((data: any[], currentMappings: ColumnMappings): { aggregatedRows: ParsedTimesheetRow[]; errors: AggregationError[] } => {
    const employeeDailyPunches = new Map<string, Map<string, Date[]>>();
    const currentAggregationErrors: AggregationError[] = [];

    if (!currentMappings.personalId || !currentMappings.combinedDateTime) {
      currentAggregationErrors.push({
        originalRow: {},
        personalIdAttempted: "N/A",
        dateAttempted: "N/A",
        error: "Required columns for Personal ID and Date And Time are not mapped. Please select them from the dropdowns."
      });
      return { aggregatedRows: [], errors: currentAggregationErrors };
    }

    data.forEach(row => {
      const csvPersonalId = String(row[currentMappings.personalId] || "").trim();
      const rawCombinedDateTime = String(row[currentMappings.combinedDateTime] || "").trim();

      console.log(`Processing raw row: Personal ID: '${csvPersonalId}', DateTime: '${rawCombinedDateTime}'`);

      if (!csvPersonalId) {
        currentAggregationErrors.push({ originalRow: row, personalIdAttempted: "N/A", dateAttempted: "N/A", error: `Skipped row: Missing Personal ID.` });
        return;
      }
      if (!rawCombinedDateTime) {
        currentAggregationErrors.push({ originalRow: row, personalIdAttempted: csvPersonalId, dateAttempted: "N/A", error: `Skipped row: Missing Date And Time for Personal ID '${csvPersonalId}'` });
        return;
      }

      const matchingEmployee = employees.find(emp => emp.personalId === csvPersonalId);
      if (!matchingEmployee) {
        currentAggregationErrors.push({ originalRow: row, personalIdAttempted: csvPersonalId, dateAttempted: "N/A", error: `Personal ID '${csvPersonalId}' not found in employee records. Ensure employee exists and has a 'Personal ID' set.` });
        console.log(`No matching employee for Personal ID: '${csvPersonalId}'`);
        return;
      }
      console.log(`Matched employee: ${matchingEmployee.firstName} ${matchingEmployee.lastName} (ID: ${matchingEmployee.id}) for Personal ID: '${csvPersonalId}'`);


      const { datePart, timePart } = extractDateAndTimeParts(rawCombinedDateTime);
      console.log(`Extracted from '${rawCombinedDateTime}': Date Part: '${datePart}', Time Part: '${timePart}'`);

      if (!datePart || !timePart) {
        currentAggregationErrors.push({ originalRow: row, personalIdAttempted: csvPersonalId, dateAttempted: datePart || "N/A", error: `Invalid date/time format for '${rawCombinedDateTime}'. Expected YYYY-MM-DD HH:mm.` });
        return;
      }

      const punchDateTime = parse(`${datePart} ${timePart}`, 'yyyy-MM-dd HH:mm', new Date());
      if (!isValid(punchDateTime)) {
        currentAggregationErrors.push({ originalRow: row, personalIdAttempted: csvPersonalId, dateAttempted: datePart, error: `Could not parse date/time '${rawCombinedDateTime}'.` });
        return;
      }
      console.log(`Parsed punchDateTime: ${punchDateTime}`);

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

          const employeePersonalId = employees.find(e => e.id === employeeId)?.personalId;
          // Find a sample row for optional fields. This assumes optional fields are consistent per day.
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
            _isValid: true,
            _errors: [],
          });
        }
      });
    });
    console.log(`Aggregation complete. Found ${aggregatedRows.length} aggregated rows. ${currentAggregationErrors.length} aggregation errors.`);
    return { aggregatedRows, errors: currentAggregationErrors };
  }, [employees]);

  const parseAndValidateData = useCallback((data: any[], currentMappings: ColumnMappings) => {
    console.log("Starting parseAndValidateData with raw data length:", data.length, "and mappings:", currentMappings);
    const { aggregatedRows, errors: aggregationErrorsFromFn } = aggregateClockTimes(data, currentMappings);
    setAggregatedData(aggregatedRows);
    setAggregationErrors(aggregationErrorsFromFn); // Set aggregation errors

    const validated = aggregatedRows.map(row => validateRow(row));
    setValidatedData(validated);

    if (aggregationErrorsFromFn.length > 0) {
      showError(`Some entries were skipped during aggregation. See 'Aggregation Errors' below.`);
    } else if (validated.some(row => !row._isValid)) {
      showError("Some rows contain errors after aggregation. Please review the table below.");
    } else if (validated.length > 0) {
      showSuccess("All entries appear valid. Ready to import!");
    } else {
      showError("No valid entries could be processed. Check mappings and aggregation errors.");
    }
  }, [aggregateClockTimes, validateRow]);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCsvHeaders([]);
      setColumnMappings(prev => {
        const initialMappings: ColumnMappings = {};
        [...requiredFields, ...optionalFields].forEach(field => {
          initialMappings[field.key] = undefined;
        });
        return initialMappings;
      });
      setParsedRawData([]);
      setAggregatedData([]);
      setValidatedData([]);
      setAggregationErrors([]); // Clear aggregation errors on new file
    } else {
      setFile(null);
    }
  }, []);

  const handleParseFile = useCallback(() => {
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
        autoMapColumns(headers);
        parseAndValidateData(results.data, columnMappings); // Initial validation
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
  }, [file, autoMapColumns, parseAndValidateData, columnMappings]);

  const handleColumnMappingChange = useCallback((key: string, value: string) => {
    setColumnMappings(prev => {
      const newMappings = { ...prev, [key]: value === "none" ? undefined : value };
      if (parsedRawData.length > 0) {
        parseAndValidateData(parsedRawData, newMappings);
      }
      return newMappings;
    });
  }, [parsedRawData, parseAndValidateData]);

  const handleRevalidate = useCallback(() => {
    if (parsedRawData.length > 0) {
      parseAndValidateData(parsedRawData, columnMappings);
    } else {
      showError("No data parsed yet. Please upload and parse a file first.");
    }
  }, [parsedRawData, parseAndValidateData, columnMappings]);

  const allRowsValid = validatedData.length > 0 && validatedData.every(row => row._isValid);
  const canImport = validatedData.length > 0 && allRowsValid;

  return {
    file,
    csvHeaders,
    columnMappings,
    parsedRawData,
    aggregatedData,
    validatedData,
    aggregationErrors, // Expose aggregation errors
    isParsing,
    allRowsValid,
    canImport,
    handleFileChange,
    handleParseFile,
    handleColumnMappingChange,
    handleRevalidate,
  };
};
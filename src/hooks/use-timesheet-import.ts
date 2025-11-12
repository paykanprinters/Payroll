"use client";

import React, { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";
import { format, parse, isValid, isAfter, min, max } from "date-fns";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { showError, showSuccess } from "@/utils/toast";

// DEBUG: Hook init
console.info("[TimesheetImport] Hook module loaded");

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
  employeeId: string;
  csvPersonalId: string;
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
  originalRow: any;
  personalIdAttempted: string;
  dateAttempted: string;
  error: string;
}

const extractDateAndTimeParts = (value: string) => {
  const dateTimeRegex = /(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/;
  const match = value.match(dateTimeRegex);
  return {
    datePart: match ? match[1] : undefined,
    timePart: match ? match[2] : undefined,
  };
};

const validateRow = (row: ParsedTimesheetRow): ParsedTimesheetRow => {
  const errors: string[] = [];

  if (!row.employeeId || row.employeeId === "Unknown") {
    errors.push(`Personal ID '${row.csvPersonalId}' not found in employee records.`);
  }

  if (!row.date || !isValid(parse(row.date, "yyyy-MM-dd", new Date()))) {
    errors.push("Valid Date (YYYY-MM-DD) is required.");
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!row.timeIn || !timeRegex.test(row.timeIn)) errors.push("Valid Time In (HH:mm) is required.");
  if (!row.timeOut || !timeRegex.test(row.timeOut)) errors.push("Valid Time Out (HH:mm) is required.");

  if (row.timeIn && row.timeOut && timeRegex.test(row.timeIn) && timeRegex.test(row.timeOut)) {
    const timeInDateObj = parse(row.timeIn, "HH:mm", new Date());
    const timeOutDateObj = parse(row.timeOut, "HH:mm", new Date());
    if (!isAfter(timeOutDateObj, timeInDateObj)) {
      errors.push("Time Out must be strictly after Time In.");
    }
  }

  const validateOptionalTimePair = (
    start: string | undefined,
    end: string | undefined,
    startName: string,
    endName: string
  ) => {
    const timeRegexLocal = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if ((start && !timeRegexLocal.test(start)) || (end && !timeRegexLocal.test(end))) {
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

const aggregateClockTimes = (
  data: any[],
  currentMappings: ColumnMappings,
  employees: MockEmployee[]
): { aggregatedRows: Omit<ParsedTimesheetRow, "_isValid" | "_errors">[]; errors: AggregationError[] } => {
  const employeeDailyPunches = new Map<string, Map<string, Date[]>>();
  const currentAggregationErrors: AggregationError[] = [];

  if (!currentMappings.personalId || !currentMappings.combinedDateTime) {
    currentAggregationErrors.push({
      originalRow: {},
      personalIdAttempted: "N/A",
      dateAttempted: "N/A",
      error: "Required columns for Personal ID and Date And Time are not mapped.",
    });
    return { aggregatedRows: [], errors: currentAggregationErrors };
  }

  data.forEach((row) => {
    const csvPersonalId = String(row[currentMappings.personalId] || "").trim();
    const rawCombinedDateTime = String(row[currentMappings.combinedDateTime] || "").trim();

    if (!csvPersonalId) {
      currentAggregationErrors.push({
        originalRow: row,
        personalIdAttempted: "N/A",
        dateAttempted: "N/A",
        error: "Skipped row: Missing Personal ID.",
      });
      return;
    }
    if (!rawCombinedDateTime) {
      currentAggregationErrors.push({
        originalRow: row,
        personalIdAttempted: csvPersonalId,
        dateAttempted: "N/A",
        error: `Skipped row: Missing Date And Time for Personal ID '${csvPersonalId}'`,
      });
      return;
    }

    const matchingEmployee = employees.find((emp) => emp.personalId === csvPersonalId);
    if (!matchingEmployee) {
      currentAggregationErrors.push({
        originalRow: row,
        personalIdAttempted: csvPersonalId,
        dateAttempted: "N/A",
        error: `Personal ID '${csvPersonalId}' not found in employee records.`,
      });
      return;
    }

    const { datePart, timePart } = extractDateAndTimeParts(rawCombinedDateTime);
    if (!datePart || !timePart) {
      currentAggregationErrors.push({
        originalRow: row,
        personalIdAttempted: csvPersonalId,
        dateAttempted: datePart || "N/A",
        error: `Invalid date/time format for '${rawCombinedDateTime}'. Expected YYYY-MM-DD HH:mm.`,
      });
      return;
    }

    const punchDateTime = parse(`${datePart} ${timePart}`, "yyyy-MM-dd HH:mm", new Date());
    if (!isValid(punchDateTime)) {
      currentAggregationErrors.push({
        originalRow: row,
        personalIdAttempted: csvPersonalId,
        dateAttempted: datePart,
        error: `Could not parse date/time '${rawCombinedDateTime}'.`,
      });
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

  const aggregatedRows: Omit<ParsedTimesheetRow, "_isValid" | "_errors">[] = [];
  employeeDailyPunches.forEach((dailyPunchesMap, employeeId) => {
    dailyPunchesMap.forEach((punches, date) => {
      if (punches.length > 0) {
        const earliestPunch = min(punches);
        const latestPunch = max(punches);
        const timeIn = format(earliestPunch, "HH:mm");
        const timeOut = format(latestPunch, "HH:mm");

        const employeePersonalId = employees.find((e) => e.id === employeeId)?.personalId;

        const sampleRowForOptionalFields = data.find((r) => {
          const rowPersonalId = currentMappings.personalId ? String(r[currentMappings.personalId] || "").trim() : "";
          const rowCombinedDateTime = currentMappings.combinedDateTime ? String(r[currentMappings.combinedDateTime] || "").trim() : "";
          const { datePart: rowDatePart } = extractDateAndTimeParts(rowCombinedDateTime);
          return rowPersonalId === employeePersonalId && rowDatePart === date;
        });

        const teaStart =
          currentMappings.teaStart && sampleRowForOptionalFields
            ? String(sampleRowForOptionalFields[currentMappings.teaStart] || "").trim()
            : undefined;
        const teaEnd =
          currentMappings.teaEnd && sampleRowForOptionalFields
            ? String(sampleRowForOptionalFields[currentMappings.teaEnd] || "").trim()
            : undefined;
        const lunchStart =
          currentMappings.lunchStart && sampleRowForOptionalFields
            ? String(sampleRowForOptionalFields[currentMappings.lunchStart] || "").trim()
            : undefined;
        const lunchEnd =
          currentMappings.lunchEnd && sampleRowForOptionalFields
            ? String(sampleRowForOptionalFields[currentMappings.lunchEnd] || "").trim()
            : undefined;

        aggregatedRows.push({
          employeeId,
          csvPersonalId: employeePersonalId || "Unknown",
          date,
          timeIn,
          teaStart: teaStart || undefined,
          teaEnd: teaEnd || undefined,
          lunchStart: lunchStart || undefined,
          lunchEnd: lunchEnd || undefined,
          timeOut,
        });
      }
    });
  });

  // DEBUG: aggregation summary
  console.debug("[TimesheetImport] Aggregation summary", {
    rowsAggregated: aggregatedRows.length,
    errorsCount: currentAggregationErrors.length,
  });

  return { aggregatedRows, errors: currentAggregationErrors };
};

export const useTimesheetImport = (employees: MockEmployee[], isOpen: boolean) => {
  const [file, setFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMappings>(() => {
    const initialMappings: ColumnMappings = {};
    [...requiredFields, ...optionalFields].forEach((field) => {
      initialMappings[field.key] = undefined;
    });
    return initialMappings;
  });
  const [parsedRawData, setParsedRawData] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  const autoMapColumns = useCallback((headers: string[]) => {
    const newMappings: ColumnMappings = {};
    [...requiredFields, ...optionalFields].forEach((field) => {
      const commonNames = [
        field.label,
        field.key,
        field.label.replace(/\s/g, ""),
        field.label.toLowerCase(),
        field.key.toLowerCase(),
        "employeeid",
        "employee_id",
        "clockid",
        "clock_id",
        "id",
        "staffid",
        "staff_id",
        "dateandtime",
        "timestamp",
        "datetime",
        "clocktime",
        "time",
        "punchtime",
      ];
      const foundHeader = headers.find((header) => commonNames.includes(header.trim().toLowerCase()));
      if (foundHeader) {
        newMappings[field.key] = foundHeader.trim();
      }
    });
    console.info("[TimesheetImport] Auto-mapped columns", newMappings);
    setColumnMappings((prev) => ({ ...prev, ...newMappings }));
  }, []);

  const { aggregatedRows, aggregationErrors, validatedData } = useMemo(() => {
    const { aggregatedRows, errors } = aggregateClockTimes(parsedRawData, columnMappings, employees);
    const validated = aggregatedRows.map((row) =>
      validateRow({ ...row, _isValid: true, _errors: [] } as ParsedTimesheetRow)
    );
    console.debug("[TimesheetImport] Validation summary", {
      validatedCount: validated.length,
      allValid: validated.every((r) => r._isValid),
    });
    return { aggregatedRows, aggregationErrors: errors, validatedData: validated };
  }, [parsedRawData, columnMappings, employees]);

  const allRowsValid = validatedData.length > 0 && validatedData.every((row) => row._isValid);
  const canImport = validatedData.some((row) => row._isValid);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    console.info("[TimesheetImport] File input change", {
      filesLength: event.target.files?.length || 0,
      fileName: selectedFile?.name,
      fileType: selectedFile?.type,
      fileSize: selectedFile?.size,
    });
    setFile(selectedFile);
    if (!selectedFile) {
      setCsvHeaders([]);
      setParsedRawData([]);
      showError("Please select a CSV file to import.");
    }
  }, []);

  const handleParseFile = useCallback(() => {
    if (!file) {
      showError("Please select a CSV file to import.");
      return;
    }
    console.info("[TimesheetImport] Starting parse of file", { name: file.name, type: file.type, size: file.size });
    setIsParsing(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.info("[TimesheetImport] Parse complete", {
          headers: results.meta.fields || [],
          rows: results.data?.length || 0,
          errors: results.errors?.length || 0,
        });
        const headers = results.meta.fields || [];
        setCsvHeaders(headers);
        setParsedRawData(results.data);
        autoMapColumns(headers);
        setIsParsing(false);
        if (results.errors.length > 0) {
          showError(`CSV parsed with ${results.errors.length} errors. Check console for details.`);
          console.error("CSV Parsing Errors:", results.errors);
        } else {
          if (results.data.length === 0) {
            showError("The file appears to be empty after parsing.");
          } else {
            showSuccess("File parsed successfully. Review entries and mappings.");
          }
        }
      },
      error: (error) => {
        setIsParsing(false);
        showError(`Error parsing file: ${error.message}`);
        console.error("PapaParse Error:", error);
      },
    });
  }, [file, autoMapColumns]);

  const handleColumnMappingChange = useCallback((key: string, value: string) => {
    console.info("[TimesheetImport] Column mapping change", { key, value });
    setColumnMappings((prev) => {
      return { ...prev, [key]: value === "none" ? undefined : value };
    });
  }, []);

  const handleRevalidate = useCallback(() => {
    console.info("[TimesheetImport] Manual revalidate triggered", {
      parsedRows: parsedRawData.length,
      aggregationErrors: aggregationErrors.length,
      canImport,
    });
    if (parsedRawData.length === 0) {
      showError("No data parsed yet. Please upload and parse a file first.");
      return;
    }
    if (aggregationErrors.length > 0) {
      showError("Some entries were skipped during aggregation. Please review 'Aggregation Errors'.");
    } else if (!canImport) {
      showError("No valid entries after aggregation. Check mappings and errors.");
    } else {
      showSuccess("Entries validated. Ready to import!");
    }
  }, [parsedRawData, aggregationErrors, canImport]);

  const reset = useCallback(() => {
    console.info("[TimesheetImport] Reset called — clearing importer state");
    setFile(null);
    setCsvHeaders([]);
    setParsedRawData([]);
    setIsParsing(false);
    setColumnMappings(() => {
      const initialMappings: ColumnMappings = {};
      [...requiredFields, ...optionalFields].forEach((field) => {
        initialMappings[field.key] = undefined;
      });
      return initialMappings;
    });
  }, []);

  return {
    file,
    csvHeaders,
    columnMappings,
    parsedRawData,
    aggregatedData: aggregatedRows,
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
  };
};
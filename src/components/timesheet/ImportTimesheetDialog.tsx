"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { UploadCloud, Eye } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { MockEmployee } from "@/lib/mock-data-interfaces";
import { useTimesheetImport, ParsedTimesheetRow } from "@/hooks/use-timesheet-import";
import ColumnMappingSection from "./ColumnMappingSection";
import ValidatedDataTable from "./ValidatedDataTable";
import FiltersBar from "./FiltersBar";
import QuickFixTools from "./QuickFixTools";
import AggregationErrorsPanel from "./AggregationErrorsPanel";
import { ImportableTimesheetEntry } from "@/lib/timesheet-types";

interface ImportTimesheetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (timesheets: ImportableTimesheetEntry[]) => void;
  employees: MockEmployee[];
}

const hhmmRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;

type SortKey = "dateAsc" | "dateDesc" | "nameAsc" | "nameDesc" | "personalAsc" | "personalDesc";

const ImportTimesheetDialog: React.FC<ImportTimesheetDialogProps> = ({ isOpen, onClose, onImport, employees }) => {
  // Always use a safe array to avoid render errors if employees is momentarily undefined
  const safeEmployees = Array.isArray(employees) ? employees : [];

  const {
    file,
    csvHeaders,
    columnMappings,
    parsedRawData,
    validatedData,
    aggregationErrors,
    isParsing,
    handleFileChange,
    handleParseFile,
    handleColumnMappingChange,
    handleRevalidate,
    reset,
  } = useTimesheetImport(safeEmployees, isOpen);

  // Local editable rows (in-place fixes)
  const [editableRows, setEditableRows] = useState<ParsedTimesheetRow[]>([]);
  useEffect(() => setEditableRows(validatedData), [validatedData]);

  // Compact mode for table
  const [compact, setCompact] = useState<boolean>(false);

  // Aggregation errors visibility
  const [showAggErrors, setShowAggErrors] = useState<boolean>(false);
  useEffect(() => {
    if (aggregationErrors.length > 0) setShowAggErrors(true);
    else setShowAggErrors(false);
  }, [aggregationErrors]);

  // Filter states
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>("");
  const [filterEmployeeName, setFilterEmployeeName] = useState<string>("");
  const [filterPersonalId, setFilterPersonalId] = useState<string>("");
  const [filterDateStart, setFilterDateStart] = useState<string>("");
  const [filterDateEnd, setFilterDateEnd] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("dateAsc");
  const [importFilteredOnly, setImportFilteredOnly] = useState<boolean>(false);

  const employeesById = useMemo(() => {
    const map = new Map<string, { name: string }>();
    safeEmployees.forEach((e) => map.set(e.id, { name: `${e.firstName} ${e.lastName}`.trim() }));
    return map;
  }, [safeEmployees]);

  // Row validation helper (client-side)
  const validateRow = (row: ParsedTimesheetRow): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    const normalizedDate = (row.date || "").replace(/\//g, "-");
    if (!isoDateRegex.test(normalizedDate)) errors.push("Invalid date format. Use YYYY-MM-DD.");
    if (!hhmmRegex.test(row.timeIn)) errors.push("Invalid Time In (HH:mm).");
    if (!hhmmRegex.test(row.timeOut)) errors.push("Invalid Time Out (HH:mm).");

    if (hhmmRegex.test(row.timeIn) && hhmmRegex.test(row.timeOut)) {
      const [ih, im] = row.timeIn.split(":").map(Number);
      const [oh, om] = row.timeOut.split(":").map(Number);
      const inMin = ih * 60 + im;
      const outMin = oh * 60 + om;
      if (outMin <= inMin) errors.push("Time Out must be later than Time In.");
    }

    if (row.teaStart || row.teaEnd) {
      if (!hhmmRegex.test(row.teaStart || "")) errors.push("Invalid Tea Start (HH:mm).");
      if (!hhmmRegex.test(row.teaEnd || "")) errors.push("Invalid Tea End (HH:mm).");
    }
    if (row.lunchStart || row.lunchEnd) {
      if (!hhmmRegex.test(row.lunchStart || "")) errors.push("Invalid Lunch Start (HH:mm).");
      if (!hhmmRegex.test(row.lunchEnd || "")) errors.push("Invalid Lunch End (HH:mm).");
    }

    const employeeExists = safeEmployees.some((e) => e.id === row.employeeId);
    if (!employeeExists) errors.push("Employee not found (resolve employee).");

    return { isValid: errors.length === 0, errors };
  };

  const updateRow = (index: number, updates: Partial<ParsedTimesheetRow>) => {
    setEditableRows((prev) => {
      const next = [...prev];
      const merged = { ...next[index], ...updates };
      if (merged.date) merged.date = merged.date.replace(/\//g, "-");
      const { isValid, errors } = validateRow(merged);
      merged._isValid = isValid;
      merged._errors = errors;
      next[index] = merged;
      return next;
    });
  };

  const resolveEmployee = (index: number, employeeId: string) => {
    updateRow(index, { employeeId });
  };

  // Quick fixes
  const bulkNormalizeDates = () => {
    setEditableRows((prev) =>
      prev.map((r) => {
        const updated = { ...r, date: (r.date || "").replace(/\//g, "-") };
        const { isValid, errors } = validateRow(updated);
        updated._isValid = isValid;
        updated._errors = errors;
        return updated;
      })
    );
  };

  const clampTimeInToStart = () => {
    setEditableRows((prev) =>
      prev.map((r) => {
        if (!hhmmRegex.test(r.timeIn)) return r;
        const [h, m] = r.timeIn.split(":").map(Number);
        const minutes = h * 60 + m;
        const clampMin = 7 * 60 + 45; // 07:45
        const clamped = minutes < clampMin ? "07:45" : r.timeIn;
        const updated = { ...r, timeIn: clamped };
        const { isValid, errors } = validateRow(updated);
        updated._isValid = isValid;
        updated._errors = errors;
        return updated;
      })
    );
  };

  const clearMissingBreaks = () => {
    setEditableRows((prev) =>
      prev.map((r) => {
        const updated = { ...r };
        if (!r.teaStart || !r.teaEnd) {
          updated.teaStart = "";
          updated.teaEnd = "";
        }
        if (!r.lunchStart || !r.lunchEnd) {
          updated.lunchStart = "";
          updated.lunchEnd = "";
        }
        const { isValid, errors } = validateRow(updated);
        updated._isValid = isValid;
        updated._errors = errors;
        return updated;
      })
    );
  };

  // Filter and sort pipeline
  const filteredRows = useMemo(() => {
    let rows = [...editableRows];

    if (filterEmployeeId) rows = rows.filter((r) => r.employeeId === filterEmployeeId);

    if (filterEmployeeName.trim()) {
      const q = filterEmployeeName.trim().toLowerCase();
      rows = rows.filter((r) => (employeesById.get(r.employeeId)?.name || "").toLowerCase().includes(q));
    }

    if (filterPersonalId.trim()) {
      const q = filterPersonalId.trim().toLowerCase();
      rows = rows.filter((r) => String(r.csvPersonalId || "").toLowerCase().includes(q));
    }

    if (filterDateStart) rows = rows.filter((r) => r.date.replace(/\//g, "-") >= filterDateStart);
    if (filterDateEnd) rows = rows.filter((r) => r.date.replace(/\//g, "-") <= filterDateEnd);

    const byName = (r: ParsedTimesheetRow) => (employeesById.get(r.employeeId)?.name || "").toLowerCase();
    const byDate = (r: ParsedTimesheetRow) => r.date.replace(/\//g, "-");
    const byPersonal = (r: ParsedTimesheetRow) => String(r.csvPersonalId || "");

    rows.sort((a, b) => {
      switch (sortKey) {
        case "dateAsc":
          return byDate(a).localeCompare(byDate(b));
        case "dateDesc":
          return byDate(b).localeCompare(byDate(a));
        case "nameAsc":
          return byName(a).localeCompare(byName(b));
        case "nameDesc":
          return byName(b).localeCompare(byName(a));
        case "personalAsc":
          return byPersonal(a).localeCompare(byPersonal(b), undefined, { numeric: true });
        case "personalDesc":
          return byPersonal(b).localeCompare(byPersonal(a), undefined, { numeric: true });
        default:
          return 0;
      }
    });

    return rows;
  }, [
    editableRows,
    filterEmployeeId,
    filterEmployeeName,
    filterPersonalId,
    filterDateStart,
    filterDateEnd,
    sortKey,
    employeesById,
  ]);

  const localAllRowsValid = useMemo(
    () => filteredRows.length > 0 && filteredRows.every((r) => r._isValid),
    [filteredRows]
  );

  const clearFilters = () => {
    setFilterEmployeeId("");
    setFilterEmployeeName("");
    setFilterPersonalId("");
    setFilterDateStart("");
    setFilterDateEnd("");
    setSortKey("dateAsc");
  };

  const handleImportData = () => {
    const sourceRows = importFilteredOnly ? filteredRows : editableRows.length ? editableRows : validatedData;
    const validEntries = sourceRows.filter((row) => row._isValid);
    if (validEntries.length === 0) {
      showError("No valid timesheet entries to import.");
      return;
    }

    const timesheetsToImport: ImportableTimesheetEntry[] = validEntries.map((row) => ({
      employeeId: row.employeeId,
      date: new Date(row.date.replace(/\//g, "-")),
      timeIn: row.timeIn,
      teaStart: row.teaStart,
      teaEnd: row.teaEnd,
      lunchStart: row.lunchStart,
      lunchEnd: row.lunchEnd,
      timeOut: row.timeOut,
    }));

    onImport(timesheetsToImport);
    showSuccess(`${timesheetsToImport.length} timesheet entries imported successfully!`);
    reset();
    onClose();
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="w-[95vw] sm:max-w-[1200px] lg:max-w-[1400px] max-h-[92vh] flex flex-col"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (isParsing) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("[data-radix-popper-content]") || target.closest(".radix-select-content")) {
            e.preventDefault();
          }
        }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Import Clock Times</DialogTitle>
          <DialogDescription>
            Upload a CSV of punches. We aggregate the earliest as Time In and latest as Time Out per employee/day.
            <br />
            <span className="font-semibold text-blue-600">Note:</span> Time Out must be strictly later than Time In.
          </DialogDescription>
        </DialogHeader>

        {/* File upload and column mapping */}
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="timesheet-file" className="sr-only">
              Upload CSV
            </Label>
            <Input
              id="timesheet-file"
              type="file"
              accept=".csv"
              onChange={(e) => {
                e.stopPropagation();
                handleFileChange(e);
              }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="flex-1"
            />
            <Button type="button" onClick={handleParseFile} disabled={!file || isParsing}>
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

        {/* Filters */}
        <FiltersBar
          employees={safeEmployees}
          compact={compact}
          setCompact={setCompact}
          filterEmployeeId={filterEmployeeId}
          setFilterEmployeeId={setFilterEmployeeId}
          filterEmployeeName={filterEmployeeName}
          setFilterEmployeeName={setFilterEmployeeName}
          filterPersonalId={filterPersonalId}
          setFilterPersonalId={setFilterPersonalId}
          filterDateStart={filterDateStart}
          setFilterDateStart={setFilterDateStart}
          filterDateEnd={filterDateEnd}
          setFilterDateEnd={setFilterDateEnd}
          sortKey={sortKey}
          setSortKey={setSortKey}
          onResetFilters={clearFilters}
          totalCount={editableRows.length}
          filteredCount={filteredRows.length}
          importFilteredOnly={importFilteredOnly}
          setImportFilteredOnly={setImportFilteredOnly}
        />

        {/* Quick-fix tools */}
        <QuickFixTools
          onNormalizeDates={bulkNormalizeDates}
          onClampTimeIn={clampTimeInToStart}
          onClearMissingBreaks={clearMissingBreaks}
        />

        {/* Aggregation Errors with auto-dismiss */}
        <AggregationErrorsPanel
          errors={aggregationErrors as any}
          show={aggregationErrors.length > 0 && showAggErrors}
          onDismiss={() => setShowAggErrors(false)}
          autoDismissMs={10000}
        />

        {/* Slim banner to restore errors after auto-dismiss */}
        {aggregationErrors.length > 0 && !showAggErrors && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
            <span className="text-sm">Aggregation Errors hidden to free space.</span>
            <Button variant="outline" size="sm" onClick={() => setShowAggErrors(true)}>
              <Eye className="h-4 w-4 mr-1" /> Show errors
            </Button>
          </div>
        )}

        {/* Editable validated data table (filtered) */}
        {filteredRows.length > 0 && (
          <ValidatedDataTable
            validatedData={filteredRows}
            employees={safeEmployees}
            allRowsValid={filteredRows.every((r) => r._isValid)}
            compact={compact}
            onEditRow={updateRow}
            onResolveEmployee={resolveEmployee}
          />
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleImportData} disabled={!localAllRowsValid}>
            Import {importFilteredOnly ? "Filtered" : "Valid"} Entries
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportTimesheetDialog;
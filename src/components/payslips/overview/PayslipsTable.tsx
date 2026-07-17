"use client";

import React from "react";
import { format, parseISO, isValid } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MockPayslip } from "@/lib/mock-data-interfaces";
import {
  Download,
  Eye,
  ReceiptText,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import { groupPayslipsByEmployee } from "@/components/payslips/overview/group-payslips";

const EMPLOYEES_PER_PAGE = 10;

const formatCurrencyZAR = (value: number | null | undefined) => {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPayDate = (payDate: string | null | undefined) => {
  if (!payDate?.trim()) return "—";
  const parsed = new Date(payDate);
  if (Number.isNaN(parsed.getTime())) return payDate;
  try {
    return format(parsed, "dd MMM yyyy");
  } catch {
    return payDate;
  }
};

const formatPayPeriod = (payPeriod: string) => {
  const [startStr, endStr] = payPeriod.split(" - ").map((s) => s.trim());
  if (!startStr || !endStr) return payPeriod;

  const start = parseISO(startStr);
  const end = parseISO(endStr);
  if (!isValid(start) || !isValid(end)) return payPeriod;

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${format(start, "dd")}–${format(end, "dd MMM yyyy")}`;
  }
  if (sameYear) {
    return `${format(start, "dd MMM")} – ${format(end, "dd MMM yyyy")}`;
  }
  return `${format(start, "dd MMM yyyy")} – ${format(end, "dd MMM yyyy")}`;
};

interface PayslipsTableProps {
  payslips: MockPayslip[];
  getEmployeeName: (employeeId: string) => string;
  getEmployeeCustomId: (employeeId: string) => string;
  selectedPayslipId?: string;
  onSelectPayslip: (payslip: MockPayslip) => void;
  onDownloadPayslip: (payslip: MockPayslip) => void;
  isDownloading?: boolean;
  listVersion?: string;
  autoExpandEmployeeId?: string;
}

const PayslipsTable: React.FC<PayslipsTableProps> = ({
  payslips,
  getEmployeeName,
  getEmployeeCustomId,
  selectedPayslipId,
  onSelectPayslip,
  onDownloadPayslip,
  isDownloading = false,
  listVersion = "",
  autoExpandEmployeeId,
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(() => new Set());

  const employeeGroups = React.useMemo(
    () => groupPayslipsByEmployee(payslips, getEmployeeName, getEmployeeCustomId),
    [payslips, getEmployeeName, getEmployeeCustomId]
  );

  const totalPages = Math.max(1, Math.ceil(employeeGroups.length / EMPLOYEES_PER_PAGE));
  const startIndex = (currentPage - 1) * EMPLOYEES_PER_PAGE;
  const paginatedGroups = employeeGroups.slice(startIndex, startIndex + EMPLOYEES_PER_PAGE);

  const toggleExpand = (employeeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const expandAllOnPage = () => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      paginatedGroups.forEach((g) => next.add(g.employeeId));
      return next;
    });
  };

  const collapseAll = () => setExpandedIds(new Set());

  React.useEffect(() => {
    setCurrentPage(1);
    const uniqueIds = [...new Set(payslips.map((p) => p.employeeId))];
    if (autoExpandEmployeeId) {
      setExpandedIds(new Set([autoExpandEmployeeId]));
    } else if (uniqueIds.length === 1) {
      setExpandedIds(new Set([uniqueIds[0]]));
    } else {
      setExpandedIds(new Set());
    }
  }, [listVersion, autoExpandEmployeeId, payslips]);

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  React.useEffect(() => {
    if (!selectedPayslipId) return;
    const match = payslips.find((p) => p.id === selectedPayslipId);
    if (!match) return;

    setExpandedIds((prev) => new Set(prev).add(match.employeeId));

    const groupIndex = employeeGroups.findIndex((g) => g.employeeId === match.employeeId);
    if (groupIndex >= 0) {
      setCurrentPage(Math.floor(groupIndex / EMPLOYEES_PER_PAGE) + 1);
    }
  }, [selectedPayslipId, payslips, employeeGroups]);

  const pageBlock = React.useMemo(() => {
    const blockStart = Math.floor((currentPage - 1) / 10) * 10 + 1;
    const blockEnd = Math.min(totalPages, blockStart + 9);
    return { blockStart, blockEnd };
  }, [currentPage, totalPages]);

  const pageNumbers = React.useMemo(() => {
    const list: number[] = [];
    for (let p = pageBlock.blockStart; p <= pageBlock.blockEnd; p++) list.push(p);
    return list;
  }, [pageBlock.blockStart, pageBlock.blockEnd]);

  if (payslips.length === 0) {
    return (
      <Card className="rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="rounded-2xl bg-muted p-3 ring-1 ring-border">
            <ReceiptText className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">No payslips in view</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjust filters or generate payslips for the selected pay period.
          </p>
        </div>
      </Card>
    );
  }

  const rangeStart = startIndex + 1;
  const rangeEnd = Math.min(startIndex + EMPLOYEES_PER_PAGE, employeeGroups.length);

  return (
    <Card className="rounded-2xl border bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Payslip register</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {employeeGroups.length} employee{employeeGroups.length === 1 ? "" : "s"} ·{" "}
              {payslips.length} payslip{payslips.length === 1 ? "" : "s"} in view. Use{" "}
              <Plus className="inline h-3 w-3" /> to expand an employee&apos;s history.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {employeeGroups.length > EMPLOYEES_PER_PAGE && (
              <span className="text-xs text-muted-foreground">
                Employees {rangeStart}–{rangeEnd} of {employeeGroups.length}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={expandAllOnPage}>
              Expand page
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={collapseAll}>
              Collapse all
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-2 pb-3 sm:px-4">
        {paginatedGroups.map((group) => {
          const isExpanded = expandedIds.has(group.employeeId);
          const hasSelectedPayslip = group.payslips.some((p) => p.id === selectedPayslipId);

          return (
            <div
              key={group.employeeId}
              className={cn(
                "overflow-hidden rounded-xl border bg-white transition-colors",
                hasSelectedPayslip && "border-primary/30 ring-1 ring-primary/10"
              )}
            >
              <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  aria-expanded={isExpanded}
                  aria-label={
                    isExpanded
                      ? `Collapse payslips for ${group.name}`
                      : `Expand payslips for ${group.name}`
                  }
                  onClick={() => toggleExpand(group.employeeId)}
                >
                  {isExpanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-semibold">{group.name}</span>
                    <span className="text-xs text-muted-foreground">{group.customId}</span>
                    <Badge variant="secondary" className="text-[10px] font-normal">
                      {group.payslips.length} payslip{group.payslips.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Latest: {group.latestPeriodLabel}
                    <span className="hidden sm:inline">
                      {" · "}
                      Net in view: {formatCurrencyZAR(group.totalNet)}
                    </span>
                  </p>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t bg-muted/20 px-2 pb-2 pt-1 sm:px-3">
                  <div className="overflow-x-auto rounded-lg border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="hidden sm:table-cell">Paid</TableHead>
                          <TableHead className="hidden md:table-cell text-right">Gross</TableHead>
                          <TableHead className="hidden lg:table-cell text-right">Deductions</TableHead>
                          <TableHead className="text-right">Net pay</TableHead>
                          <TableHead className="w-[72px] text-right"> </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.payslips.map((payslip, index) => {
                          const isSelected = payslip.id === selectedPayslipId;
                          const rowKey =
                            payslip.id || `${payslip.employeeId}-${payslip.payPeriod}-${index}`;

                          return (
                            <TableRow
                              key={rowKey}
                              className={cn("cursor-pointer", isSelected && "bg-muted/50")}
                              onClick={() => onSelectPayslip(payslip)}
                            >
                              <TableCell className="py-2 text-sm">
                                {formatPayPeriod(payslip.payPeriod)}
                              </TableCell>
                              <TableCell className="hidden py-2 text-sm sm:table-cell">
                                {formatPayDate(payslip.payDate)}
                              </TableCell>
                              <TableCell className="hidden py-2 text-right text-sm md:table-cell">
                                {formatCurrencyZAR(payslip.grossEarnings)}
                              </TableCell>
                              <TableCell className="hidden py-2 text-right text-sm text-muted-foreground lg:table-cell">
                                {formatCurrencyZAR(payslip.totalDeductions)}
                              </TableCell>
                              <TableCell className="py-2 text-right text-sm font-medium">
                                {formatCurrencyZAR(payslip.netPay)}
                              </TableCell>
                              <TableCell className="py-2 text-right">
                                <div
                                  className="inline-flex gap-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Button
                                    variant={isSelected ? "default" : "ghost"}
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Preview"
                                    onClick={() => onSelectPayslip(payslip)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title="Download PDF"
                                    disabled={isDownloading}
                                    onClick={() => onDownloadPayslip(payslip)}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {totalPages > 1 && (
          <Pagination className="mt-2">
            <PaginationContent className="flex-wrap gap-1">
              <PaginationItem>
                <PaginationLink
                  size="default"
                  onClick={() => setCurrentPage(1)}
                  className={cn(
                    "rounded-full bg-white gap-1 pl-2.5 pr-3",
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                >
                  <ChevronsLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">First</span>
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  size="default"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  className={cn(
                    "rounded-full bg-white gap-1 pl-2.5 pr-3",
                    currentPage === 1 && "pointer-events-none opacity-50"
                  )}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </PaginationLink>
              </PaginationItem>
              {pageNumbers.map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    onClick={() => setCurrentPage(p)}
                    isActive={currentPage === p}
                    className={cn(
                      "rounded-full bg-white",
                      currentPage === p &&
                        "bg-primary text-primary-foreground border-primary hover:bg-primary/90 hover:text-primary-foreground"
                    )}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationLink
                  size="default"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  className={cn(
                    "rounded-full bg-white gap-1 pl-3 pr-2.5",
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  size="default"
                  onClick={() => setCurrentPage(totalPages)}
                  className={cn(
                    "rounded-full bg-white gap-1 pl-3 pr-2.5",
                    currentPage === totalPages && "pointer-events-none opacity-50"
                  )}
                >
                  <span className="hidden sm:inline">Last</span>
                  <ChevronsRight className="h-4 w-4" />
                </PaginationLink>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
};

export default PayslipsTable;

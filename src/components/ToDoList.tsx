"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ToDoEntry } from "@/lib/mock-data-interfaces";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

interface ToDoListProps {
  toDos: ToDoEntry[];
  pendingCount: number;
  markToDoAsDone: (id: string) => Promise<void>;
}

const ITEMS_PER_PAGE = 10;

const ToDoList: React.FC<ToDoListProps> = ({ toDos, markToDoAsDone }) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const pendingToDos = React.useMemo(() => toDos.filter((todo) => todo.status === "pending"), [toDos]);

  const totalPages = Math.max(1, Math.ceil(pendingToDos.length / ITEMS_PER_PAGE));

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndexExclusive = Math.min(pendingToDos.length, startIndex + ITEMS_PER_PAGE);
  const paginatedToDos = pendingToDos.slice(startIndex, endIndexExclusive);

  const handleFirstPage = () => setCurrentPage(1);
  const handleLastPage = () => setCurrentPage(totalPages);
  const handlePreviousPage = () => setCurrentPage((prev) => Math.max(1, prev - 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(totalPages, prev + 1));

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

  const getLevelBadge = (level: ToDoEntry["level"]) => {
    switch (level) {
      case "critical":
        return (
          <Badge variant="destructive" className="bg-red-500 text-white">
            Critical
          </Badge>
        );
      case "warning":
        return (
          <Badge variant="outline" className="bg-yellow-500 text-white border-yellow-500">
            Warning
          </Badge>
        );
      case "info":
        return <Badge variant="secondary">Info</Badge>;
      default:
        return null;
    }
  };

  const getLevelIcon = (level: ToDoEntry["level"]) => {
    switch (level) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full rounded-2xl border bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          Payroll To-Dos
          {pendingToDos.length > 0 && (
            <Badge className="ml-1 bg-primary text-primary-foreground">{pendingToDos.length} Pending</Badge>
          )}
        </CardTitle>
        <CardDescription>
          High-priority tasks and alerts across employees, timesheets, payroll and compliance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingToDos.length > 0 ? (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              Showing {startIndex + 1}–{endIndexExclusive} of {pendingToDos.length}
            </div>

            {paginatedToDos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-start justify-between gap-4 rounded-xl border bg-muted/50 p-3"
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="mt-0.5">{getLevelIcon(todo.level)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-snug">{todo.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {getLevelBadge(todo.level)}
                      <span>Module: {todo.module}</span>
                      {todo.relatedField && (
                        <span>Field: {todo.relatedField.replace(/([A-Z])/g, " $1").trim()}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {todo.actionUrl && (
                    <Button asChild variant="outline" size="sm" className="rounded-full bg-white">
                      <Link to={todo.actionUrl}>
                        Open <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => markToDoAsDone(todo.id)}
                    title="Mark as done"
                    className="rounded-full"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </Button>
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <Pagination className="pt-1">
                <PaginationContent className="flex-wrap gap-1">
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={handleFirstPage}
                      className={cn(
                        "rounded-full bg-white gap-1 pl-2.5 pr-3",
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                      aria-label="Go to first page"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                      <span>First</span>
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={handlePreviousPage}
                      className={cn(
                        "rounded-full bg-white gap-1 pl-2.5 pr-3",
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                      aria-label="Go to previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Back</span>
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
                      onClick={handleNextPage}
                      className={cn(
                        "rounded-full bg-white gap-1 pl-3 pr-2.5",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                      aria-label="Go to next page"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink
                      size="default"
                      onClick={handleLastPage}
                      className={cn(
                        "rounded-full bg-white gap-1 pl-3 pr-2.5",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                      aria-label="Go to last page"
                    >
                      <span>Last</span>
                      <ChevronsRight className="h-4 w-4" />
                    </PaginationLink>
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <p className="text-base font-semibold text-slate-900">All caught up</p>
            <p className="text-sm">No pending payroll tasks at the moment.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ToDoList;
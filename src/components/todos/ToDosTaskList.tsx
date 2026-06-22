"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  ArrowRight,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { ToDoEntry } from "@/lib/mock-data-interfaces";
import { formatTodoRelatedField } from "@/lib/todos-admin-summary";
import { ToDoLevelBadge, ToDoLevelIcon } from "@/components/todos/ToDoSeverityBadge";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 10;

interface ToDosTaskListProps {
  items: ToDoEntry[];
  isLoading: boolean;
  variant: "pending" | "completed";
  onMarkDone?: (id: string) => void;
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const blockStart = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const blockEnd = Math.min(totalPages, blockStart + 9);
  const list: number[] = [];
  for (let p = blockStart; p <= blockEnd; p++) list.push(p);
  return list;
}

const ToDosTaskList: React.FC<ToDosTaskListProps> = ({
  items,
  isLoading,
  variant,
  onMarkDone,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [items.length, variant]);

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndexExclusive = Math.min(items.length, startIndex + ITEMS_PER_PAGE);
  const paginatedItems = useMemo(
    () => items.slice(startIndex, endIndexExclusive),
    [items, startIndex, endIndexExclusive]
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-64 max-w-full" />
            </div>
            <div className="mt-2 flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    if (variant === "pending") {
      return (
        <div className="py-10 text-center text-muted-foreground">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
          <p className="text-base font-semibold text-foreground">No pending tasks</p>
          <p className="text-sm">You are caught up for the current filters.</p>
        </div>
      );
    }

    return (
      <div className="py-10 text-center text-muted-foreground">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
        <p className="text-base font-semibold text-foreground">No completed tasks</p>
        <p className="text-sm">Resolved items will appear here after you mark them done.</p>
      </div>
    );
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Showing {startIndex + 1}–{endIndexExclusive} of {items.length}
      </div>

      <div className="space-y-3">
        {paginatedItems.map((todo) => (
          <div
            key={todo.id}
            className={cn(
              "flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-start sm:justify-between",
              variant === "completed"
                ? "border-emerald-100 bg-emerald-50/50 text-muted-foreground"
                : "bg-white hover:bg-muted/40"
            )}
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              {variant === "completed" ? (
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <div className="mt-0.5 shrink-0">
                  <ToDoLevelIcon level={todo.level} />
                </div>
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium leading-snug",
                    variant === "completed" && "line-through"
                  )}
                >
                  {todo.message}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {variant === "pending" && <ToDoLevelBadge level={todo.level} />}
                  <span className="rounded-md bg-muted/60 px-1.5 py-0.5">{todo.module}</span>
                  {todo.relatedField && (
                    <span className="hidden sm:inline">
                      Field: {formatTodoRelatedField(todo.relatedField)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {variant === "pending" && (
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-start">
                {todo.actionUrl && (
                  <Button asChild variant="outline" size="sm" className="rounded-full bg-white">
                    <Link to={todo.actionUrl}>
                      Open
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
                {onMarkDone && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onMarkDone(todo.id)}
                    title="Mark as done"
                    className="rounded-full"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination className="pt-1">
          <PaginationContent className="flex-wrap gap-1">
            <PaginationItem>
              <PaginationLink
                size="default"
                onClick={() => setCurrentPage(1)}
                className={cn(
                  "gap-1 rounded-full bg-white pl-2.5 pr-3",
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
                aria-label="Go to first page"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="hidden sm:inline">First</span>
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationLink
                size="default"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                className={cn(
                  "gap-1 rounded-full bg-white pl-2.5 pr-3",
                  currentPage === 1 && "pointer-events-none opacity-50"
                )}
                aria-label="Go to previous page"
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
                      "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                  )}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationLink
                size="default"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                className={cn(
                  "gap-1 rounded-full bg-white pl-3 pr-2.5",
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
                aria-label="Go to next page"
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
                  "gap-1 rounded-full bg-white pl-3 pr-2.5",
                  currentPage === totalPages && "pointer-events-none opacity-50"
                )}
                aria-label="Go to last page"
              >
                <span className="hidden sm:inline">Last</span>
                <ChevronsRight className="h-4 w-4" />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
};

export default ToDosTaskList;

"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info } from "lucide-react";
import { ToDoEntry } from "@/lib/mock-data-interfaces";
import { cn } from "@/lib/utils";

export function ToDoLevelIcon({
  level,
  className,
}: {
  level: ToDoEntry["level"];
  className?: string;
}) {
  switch (level) {
    case "critical":
      return <AlertTriangle className={cn("h-4 w-4 text-red-500", className)} />;
    case "warning":
      return <AlertTriangle className={cn("h-4 w-4 text-amber-500", className)} />;
    case "info":
      return <Info className={cn("h-4 w-4 text-sky-600", className)} />;
    default:
      return null;
  }
}

export function ToDoLevelBadge({ level }: { level: ToDoEntry["level"] }) {
  switch (level) {
    case "critical":
      return (
        <Badge variant="destructive" className="bg-red-600 text-white">
          Critical
        </Badge>
      );
    case "warning":
      return (
        <Badge variant="outline" className="border-amber-500 bg-amber-500 text-white">
          Warning
        </Badge>
      );
    case "info":
      return <Badge variant="secondary">Info</Badge>;
    default:
      return null;
  }
}

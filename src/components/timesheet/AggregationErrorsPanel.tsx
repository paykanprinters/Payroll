"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type AggregationError = {
  personalIdAttempted?: string;
  dateAttempted?: string;
  error: string;
};

type Props = {
  errors: AggregationError[];
  show: boolean;
  onDismiss: () => void;
  autoDismissMs?: number;
};

const AggregationErrorsPanel: React.FC<Props> = ({ errors, show, onDismiss, autoDismissMs = 10000 }) => {
  useEffect(() => {
    if (!show || errors.length === 0) return;
    const timer = setTimeout(() => onDismiss(), autoDismissMs);
    return () => clearTimeout(timer);
  }, [show, errors, onDismiss, autoDismissMs]);

  if (!show || errors.length === 0) return null;

  return (
    <div className="mt-3 transition-opacity duration-700 ease-out opacity-100">
      <Card className="border-red-500 bg-red-50 text-red-800">
        <CardHeader className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Aggregation Errors ({errors.length})</CardTitle>
            <CardDescription>The following entries could not be processed into daily timesheets.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            className="text-red-800 border-red-300 hover:bg-red-100"
            title="Dismiss"
          >
            Dismiss
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-40 w-full rounded-md border p-4 bg-white text-gray-900">
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errors.map((err, index) => (
                <li key={index}>
                  <span className="font-semibold">Personal ID:</span> {err.personalIdAttempted || "N/A"},{" "}
                  <span className="font-semibold">Date:</span> {err.dateAttempted || "N/A"} - {err.error}
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default AggregationErrorsPanel;
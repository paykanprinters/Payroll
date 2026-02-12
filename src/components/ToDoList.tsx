"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ToDoEntry } from "@/lib/mock-data-interfaces";

interface ToDoListProps {
  toDos: ToDoEntry[];
  pendingCount: number;
  markToDoAsDone: (id: string) => Promise<void>;
}

const ToDoList: React.FC<ToDoListProps> = ({ toDos, markToDoAsDone }) => {
  const pendingToDos = toDos.filter((todo) => todo.status === "pending");

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
            <Badge className="ml-1 bg-primary text-primary-foreground">
              {pendingToDos.length} Pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          High-priority tasks and alerts across employees, timesheets, payroll and compliance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingToDos.length > 0 ? (
          <div className="space-y-4">
            {pendingToDos.slice(0, 6).map((todo) => (
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
                        <span>
                          Field: {todo.relatedField.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {todo.actionUrl && (
                    <Button asChild variant="outline" size="sm">
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
                  >
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </Button>
                </div>
              </div>
            ))}
            {pendingToDos.length > 6 && (
              <p className="pt-1 text-center text-sm text-muted-foreground">
                And {pendingToDos.length - 6} more pending items…
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-600" />
            <p className="text-base font-semibold text-slate-900">All caught up</p>
            <p className="text-sm">No pending payroll tasks at the moment.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ToDoList;
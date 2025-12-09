"use client";

import React, { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info, ArrowRight, ListTodo } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

type LevelType = "critical" | "warning" | "info" | string;

function isSafeUrl(href: string): boolean {
  try {
    if (href.startsWith("/")) return true; // internal route
    const u = new URL(href);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const ToDosPage: React.FC = () => {
  const { toDos, markToDoAsDone } = usePayrollProcessor();

  const pendingToDos = toDos.filter((todo: any) => (todo.status ?? (todo as any).status) === "pending");
  const completedToDos = toDos.filter((todo: any) => (todo.status ?? (todo as any).status) === "done");

  useEffect(() => {
    console.log("ToDosPage: Rendered. Full To-Dos array:", toDos);
    console.log("ToDosPage: Rendered. Pending To-Dos array (filtered):", pendingToDos);
    console.log("ToDosPage: Rendered. Pending Count (from filter):", pendingToDos.length);
  }, [toDos, pendingToDos]);

  const getLevelBadge = (level: LevelType) => {
    switch (level) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-500 text-white">Critical</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-yellow-500 text-white border-yellow-500">Warning</Badge>;
      case "info":
        return <Badge variant="secondary">Info</Badge>;
      default:
        return null;
    }
  };

  const getLevelIcon = (level: LevelType) => {
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

  const getRelatedField = (todo: any): string | null => {
    const rf = todo.relatedField ?? todo.related_field ?? null;
    return rf ? String(rf) : null;
  };

  const getActionUrl = (todo: any): string | null => {
    const url = todo.actionUrl ?? todo.action_url ?? null;
    return url ? String(url) : null;
  };

  const getLevel = (todo: any): LevelType => {
    return (todo.level as LevelType) ?? "info";
  };

  const getModule = (todo: any): string => {
    return String(todo.module ?? "");
  };

  const getMessage = (todo: any): string => {
    return String(todo.message ?? "");
  };

  const renderAction = (actionUrl: string | null) => {
    if (!actionUrl) return null;
    if (!isSafeUrl(actionUrl)) {
      return (
        <span className="text-xs text-muted-foreground" title="Unsafe or unsupported link">
          {actionUrl}
        </span>
      );
    }
    if (actionUrl.startsWith("/")) {
      return (
        <Button asChild variant="outline" size="sm">
          <Link to={actionUrl}>
            Go <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      );
    }
    return (
      <a
        href={actionUrl}
        className="text-xs text-blue-600 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open <ArrowRight className="inline ml-1 h-3 w-3" />
      </a>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <ListTodo className="h-8 w-8" /> All Payroll To-Dos
      </h1>
      <p className="text-lg text-muted-foreground">
        A comprehensive list of all pending and completed tasks across the system.
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending Tasks
            {pendingToDos.length > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground">
                {pendingToDos.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            These tasks require your immediate attention or review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingToDos.length > 0 ? (
            <div className="space-y-4">
              {pendingToDos.map((todo: any) => {
                const level = getLevel(todo);
                const actionUrl = getActionUrl(todo);
                const relatedField = getRelatedField(todo);
                return (
                  <div key={todo.id} className="flex items-start justify-between p-3 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-3 flex-1">
                      {getLevelIcon(level)}
                      <div>
                        <p className="font-medium text-sm">{getMessage(todo)}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {getLevelBadge(level)}
                          <span>Module: {getModule(todo)}</span>
                          {relatedField && (
                            <span className="ml-2">Field: {relatedField.replace(/([A-Z])/g, ' $1').trim()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {renderAction(actionUrl)}
                      <Button variant="ghost" size="icon" onClick={() => markToDoAsDone(todo.id)} title="Mark as Done">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
              <p className="text-lg font-semibold">No pending tasks!</p>
              <p className="text-sm">You're all caught up.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Completed Tasks
            {completedToDos.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {completedToDos.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            These tasks have been marked as done.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedToDos.length > 0 ? (
            <div className="space-y-4">
              {completedToDos.map((todo: any) => {
                const relatedField = getRelatedField(todo);
                const actionUrl = getActionUrl(todo);
                return (
                  <div key={todo.id} className="flex items-start justify-between p-3 border rounded-md bg-green-50/50 text-muted-foreground">
                    <div className="flex items-center gap-3 flex-1">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm line-through">{getMessage(todo)}</p>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span>Module: {getModule(todo)}</span>
                          {relatedField && (
                            <span className="ml-2">Field: {relatedField.replace(/([A-Z])/g, ' $1').trim()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {renderAction(actionUrl)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ListTodo className="h-10 w-10 mx-auto mb-3" />
              <p className="text-lg font-semibold">No completed tasks yet.</p>
              <p className="text-sm">Start marking tasks as done!</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-4 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">To-Do List Notes:</h3>
        <p className="text-sm">
          This To-Do list is dynamically generated. Unsafe or unsupported links are shown as plain text.
        </p>
      </div>
    </div>
  );
};

export default ToDosPage;
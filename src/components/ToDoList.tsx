"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Info, ArrowRight } from "lucide-react";
import { useToDosData } from "@/hooks/use-todos-data";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ToDoEntry } from "@/lib/mock-data-interfaces";

const ToDoList: React.FC = () => {
  const { toDos, markToDoAsDone } = useToDosData();

  const pendingToDos = toDos.filter(todo => todo.status === "pending");

  const getLevelBadge = (level: ToDoEntry["level"]) => {
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
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-xl font-bold">📋 Top Payroll To-Dos</span>
          {pendingToDos.length > 0 && (
            <Badge className="ml-2 bg-primary text-primary-foreground">
              {pendingToDos.length} Pending
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          High-priority tasks and alerts across your payroll modules.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingToDos.length > 0 ? (
          <div className="space-y-4">
            {pendingToDos.slice(0, 5).map((todo) => (
              <div key={todo.id} className="flex items-start justify-between p-3 border rounded-md bg-muted/50">
                <div className="flex items-center gap-3 flex-1">
                  {getLevelIcon(todo.level)}
                  <div>
                    <p className="font-medium text-sm">{todo.message}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                      {getLevelBadge(todo.level)}
                      <span>Module: {todo.module}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {todo.actionUrl && (
                    <Button asChild variant="outline" size="sm">
                      <Link to={todo.actionUrl}>
                        Go <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => markToDoAsDone(todo.id)} title="Mark as Done">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </Button>
                </div>
              </div>
            ))}
            {pendingToDos.length > 5 && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                And {pendingToDos.length - 5} more pending to-dos...
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-10 w-10 mx-auto mb-3 text-green-500" />
            <p className="text-lg font-semibold">All caught up!</p>
            <p className="text-sm">No pending payroll tasks at the moment.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ToDoList;
"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const TopToDosCard: React.FC = () => {
  const todos = [
    { id: "1", task: "Review July 2024 Payslips", completed: false },
    { id: "2", task: "Approve John Doe's Annual Leave Request", completed: false },
    { id: "3", task: "Onboard New Employee: Sarah Connor", completed: true },
    { id: "4", task: "Submit PAYE/UIF/SDL Returns to SARS", completed: false },
    { id: "5", task: "Update Company Bank Details", completed: false },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top To-Dos</CardTitle>
        <CardDescription>Important tasks requiring your attention.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {todos.map((todo, index) => (
          <React.Fragment key={todo.id}>
            <div className="flex items-center space-x-2">
              <Checkbox id={`todo-${todo.id}`} checked={todo.completed} disabled />
              <Label htmlFor={`todo-${todo.id}`} className={todo.completed ? "line-through text-muted-foreground" : ""}>
                {todo.task}
              </Label>
            </div>
            {index < todos.length - 1 && <Separator />}
          </React.Fragment>
        ))}
      </CardContent>
    </Card>
  );
};

export default TopToDosCard;
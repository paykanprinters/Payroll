"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTodosData } from "@/hooks/use-todos-data";

const levelColor: Record<string, string> = {
  info: "bg-blue-100 text-blue-700",
  warning: "bg-yellow-100 text-yellow-700",
  critical: "bg-red-100 text-red-700",
};

export default function ToDoList() {
  const { todos, loading } = useTodosData();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>To-dos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : todos.length === 0 ? (
          <div className="text-sm text-muted-foreground">No to-dos.</div>
        ) : (
          todos.map((t) => (
            <div key={t.id} className="flex items-start justify-between rounded-md border p-3">
              <div className="pr-3">
                <div className="font-medium">{t.message}</div>
                <div className="text-xs text-muted-foreground mt-1">{t.module}</div>
                {t.action_url ? (
                  <a
                    href={t.action_url}
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block break-all"
                    rel="noopener noreferrer"
                  >
                    Open action
                  </a>
                ) : null}
              </div>
              <Badge className={levelColor[t.level] ?? ""}>{t.level}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
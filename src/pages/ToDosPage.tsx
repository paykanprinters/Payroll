"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import SummaryAccent from "@/components/dashboard/SummaryAccent";
import ToDosHeader from "@/components/todos/ToDosHeader";
import { CheckCircle, AlertTriangle, Info, ArrowRight, RefreshCcw, ListFilter, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ToDoEntry } from "@/lib/mock-data-interfaces";
import { usePayrollProcessor } from "@/hooks/use-payroll-processor";

const ToDosPage: React.FC = () => {
  const {
    toDos,
    pendingCount,
    markToDoAsDone,
    isLoadingToDos,
    isMockDataEnabled,
    isAuthenticated,
    triggerGenerateToDos,
  } = usePayrollProcessor();

  const [severityFilter, setSeverityFilter] = useState<"all" | "critical" | "warning" | "info">("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const pendingToDos = useMemo(() => toDos.filter(t => t.status === "pending"), [toDos]);
  const completedToDos = useMemo(() => toDos.filter(t => t.status === "done"), [toDos]);

  const modules = useMemo(() => {
    const unique = Array.from(new Set(toDos.map(t => t.module).filter(Boolean)));
    return unique.sort();
  }, [toDos]);

  useEffect(() => {
    console.log("ToDosPage: Rendered. Full To-Dos array:", toDos);
    console.log("ToDosPage: Pending Count:", pendingCount);
  }, [toDos, pendingCount]);

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

  const matchesFilters = (todo: ToDoEntry) => {
    if (severityFilter !== "all" && todo.level !== severityFilter) return false;
    if (moduleFilter !== "all" && todo.module !== moduleFilter) return false;
    if (search.trim().length > 0) {
      const hay = `${todo.message} ${todo.module} ${todo.relatedField ?? ""}`.toLowerCase();
      const needle = search.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  };

  const filteredPending = useMemo(
    () => pendingToDos.filter(matchesFilters),
    [pendingToDos, severityFilter, moduleFilter, search]
  );
  const filteredCompleted = useMemo(
    () => completedToDos.filter(matchesFilters),
    [completedToDos, severityFilter, moduleFilter, search]
  );

  return (
    <div className="flex flex-col gap-4">
      <ToDosHeader />

      {/* Toolbar: Filters, Search, Actions */}
      <Card className="border rounded-xl">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={severityFilter} onValueChange={(v: "all" | "critical" | "warning" | "info") => setSeverityFilter(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ListFilter className="h-4 w-4 text-muted-foreground" />
              <Select value={moduleFilter} onValueChange={(v: string) => setModuleFilter(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Module" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All modules</SelectItem>
                  {modules.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search message, module or field..."
                className="w-full"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.dispatchEvent(new Event("appFocusRefresh"))}
              title="Refresh To-Dos"
            >
              <RefreshCcw className="mr-2 h-3 w-3" /> Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => triggerGenerateToDos()}
              disabled={isMockDataEnabled || !isAuthenticated}
              title={isMockDataEnabled ? "Disabled in mock mode" : "Generate To-Dos from live data"}
            >
              <Sparkles className="mr-2 h-3 w-3" /> Generate To-Dos
            </Button>
            <span className="text-xs text-muted-foreground">
              {isMockDataEnabled
                ? "Mock mode: To-Dos come from localStorage. Switch off mock data to use live generation."
                : "Live mode: Generate To-Dos will refresh from Supabase."}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
          <SummaryAccent variant="amber" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              Pending
              {pendingCount > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground">{pendingCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>Items needing your attention</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-muted-foreground">
            Filtered: {filteredPending.length}
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm">
          <SummaryAccent variant="emerald" />
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2">
              Completed
              {completedToDos.length > 0 && (
                <Badge variant="secondary" className="ml-2">{completedToDos.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>Already resolved tasks</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-muted-foreground">
            Filtered: {filteredCompleted.length}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full max-w-md grid grid-cols-2 gap-2 bg-white/60 backdrop-blur-md rounded-full p-1 ring-1 ring-muted">
          <TabsTrigger value="pending" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-foreground">
            Pending
            {filteredPending.length > 0 && (
              <Badge className="ml-2 bg-primary text-primary-foreground">{filteredPending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-full data-[state=active]:bg-white data-[state=active]:text-foreground">
            Completed
            {filteredCompleted.length > 0 && (
              <Badge variant="secondary" className="ml-2">{filteredCompleted.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm transition-shadow">
            <SummaryAccent variant="amber" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Pending Tasks
                {filteredPending.length > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {filteredPending.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                These tasks require your immediate attention or review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingToDos ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="p-3 border rounded-xl bg-white">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPending.length > 0 ? (
                <div className="space-y-4">
                  {filteredPending.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start justify-between p-3 border rounded-xl bg-white hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getLevelIcon(todo.level)}
                        <div>
                          <p className="font-medium text-sm">{todo.message}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            {getLevelBadge(todo.level)}
                            <span>Module: {todo.module}</span>
                            {todo.relatedField && (
                              <span className="ml-2">Field: {todo.relatedField.replace(/([A-Z])/g, ' $1').trim()}</span>
                            )}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markToDoAsDone(todo.id)}
                          title="Mark as Done"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card className="relative overflow-hidden border rounded-xl bg-white shadow-sm transition-shadow">
            <SummaryAccent variant="emerald" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Completed Tasks
                {filteredCompleted.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredCompleted.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                These tasks have been marked as done.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingToDos ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-3 border rounded-xl bg-white">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-4 w-4 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCompleted.length > 0 ? (
                <div className="space-y-4">
                  {filteredCompleted.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-start justify-between p-3 border rounded-xl bg-green-50/60 text-muted-foreground"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium text-sm line-through">{todo.message}</p>
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <span>Module: {todo.module}</span>
                            {todo.relatedField && (
                              <span className="ml-2">Field: {todo.relatedField.replace(/([A-Z])/g, ' $1').trim()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <svg className="h-10 w-10 mx-auto mb-3" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-lg font-semibold">No completed tasks yet.</p>
                  <p className="text-sm">Start marking tasks as done!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-2 p-4 border rounded-lg bg-blue-50 text-blue-800">
        <h3 className="font-semibold text-lg mb-2">To-Do List Notes:</h3>
        <p className="text-sm">
          This To-Do list is dynamically generated. In mock mode, tasks come from localStorage; in live mode, use the Generate To-Dos button to refresh from Supabase.
        </p>
      </div>
    </div>
  );
};

export default ToDosPage;
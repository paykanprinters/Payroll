"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import ToDosHeader from "@/components/todos/ToDosHeader";
import ToDosFiltersBar from "@/components/todos/ToDosFiltersBar";
import ToDosStats from "@/components/todos/ToDosStats";
import ToDosTaskList from "@/components/todos/ToDosTaskList";
import ErrorBoundary from "@/components/ErrorBoundary";
import { usePayrollProcessor } from "@/context/PayrollDataContext";
import {
  buildTodosAdminSummary,
  filterTodos,
  getTodoModules,
  type TodoSeverityFilter,
} from "@/lib/todos-admin-summary";

const ToDosPage: React.FC = () => {
  const {
    toDos,
    markToDoAsDone,
    isLoadingToDos,
    isMockDataEnabled,
    isAuthenticated,
    triggerGenerateToDos,
  } = usePayrollProcessor();

  const [severityFilter, setSeverityFilter] = useState<TodoSeverityFilter>("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [isGenerating, setIsGenerating] = useState(false);

  const modules = useMemo(() => getTodoModules(toDos), [toDos]);

  const filteredTodos = useMemo(
    () =>
      filterTodos(toDos, {
        severity: severityFilter,
        module: moduleFilter,
        search,
      }),
    [toDos, severityFilter, moduleFilter, search]
  );

  const summary = useMemo(() => buildTodosAdminSummary(filteredTodos), [filteredTodos]);

  const filteredPending = useMemo(
    () => filteredTodos.filter((t) => t.status === "pending"),
    [filteredTodos]
  );
  const filteredCompleted = useMemo(
    () => filteredTodos.filter((t) => t.status === "done"),
    [filteredTodos]
  );

  const clearFilters = () => {
    setSeverityFilter("all");
    setModuleFilter("all");
    setSearch("");
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await triggerGenerateToDos();
    } finally {
      setIsGenerating(false);
    }
  };

  const generateDisabled = isMockDataEnabled || !isAuthenticated;
  const generateTitle = isMockDataEnabled
    ? "Disabled in mock mode"
    : !isAuthenticated
      ? "Sign in to generate to-dos"
      : "Rescan live data for new action items";

  return (
    <div className="flex flex-col gap-4">
      <ToDosHeader
        onGenerate={handleGenerate}
        generateDisabled={generateDisabled}
        generateTitle={generateTitle}
        isGenerating={isGenerating}
      />

      <Card className="rounded-xl border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Narrow tasks by severity, module, or search. KPIs below reflect the filtered set.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToDosFiltersBar
            severityFilter={severityFilter}
            onSeverityFilterChange={setSeverityFilter}
            moduleFilter={moduleFilter}
            onModuleFilterChange={setModuleFilter}
            modules={modules}
            search={search}
            onSearchChange={setSearch}
            filteredCount={filteredTodos.length}
            totalCount={toDos.length}
            onClear={clearFilters}
            onRefresh={() => window.dispatchEvent(new Event("appFocusRefresh"))}
            onGenerate={handleGenerate}
            generateDisabled={generateDisabled}
            generateTitle={generateTitle}
            isMockDataEnabled={isMockDataEnabled}
          />
        </CardContent>
      </Card>

      {isLoadingToDos ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-700" aria-label="Loading to-dos" />
          <p className="text-sm text-muted-foreground">Loading to-dos…</p>
        </div>
      ) : (
        <>
          <ToDosStats summary={summary} />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "completed")}>
            <TabsList className="grid h-auto w-full max-w-md grid-cols-2 gap-1 rounded-full bg-muted/60 p-1">
              <TabsTrigger value="pending" className="rounded-full data-[state=active]:bg-white">
                Pending
                {filteredPending.length > 0 && (
                  <Badge className="ml-2 bg-primary text-primary-foreground">
                    {filteredPending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="rounded-full data-[state=active]:bg-white">
                Completed
                {filteredCompleted.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredCompleted.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-4">
              <Card className="rounded-xl border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Pending tasks</CardTitle>
                  <CardDescription>
                    Resolve or open the linked screen. Marking done may flag employee fields as
                    intentionally blank.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary fallbackTitle="To-do list error">
                    <ToDosTaskList
                      items={filteredPending}
                      isLoading={false}
                      variant="pending"
                      onMarkDone={markToDoAsDone}
                    />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <Card className="rounded-xl border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Completed tasks</CardTitle>
                  <CardDescription>Items you have already resolved or dismissed.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ErrorBoundary fallbackTitle="Completed to-do list error">
                    <ToDosTaskList
                      items={filteredCompleted}
                      isLoading={false}
                      variant="completed"
                    />
                  </ErrorBoundary>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="py-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How to-dos work</p>
          <p className="mt-2">
            Tasks are generated from gaps in employee profiles, overdue timesheets, leave conflicts,
            and payroll setup. Tackle <strong>critical</strong> items before running payroll. In live
            mode, use <strong>Generate</strong> after bulk imports or settings changes. Marking a
            field-related task done records it as intentionally blank on the employee record.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ToDosPage;

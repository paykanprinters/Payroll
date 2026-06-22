import { ToDoEntry } from "@/lib/mock-data-interfaces";

export type TodoSeverityFilter = "all" | ToDoEntry["level"];
export type TodoStatusFilter = "all" | ToDoEntry["status"];

export interface TodoRecordFilters {
  severity: TodoSeverityFilter;
  module: string;
  search: string;
}

export interface TodosAdminSummary {
  pendingInView: number;
  completedInView: number;
  criticalInView: number;
  warningInView: number;
  infoInView: number;
  moduleDistribution: { name: string; value: number }[];
}

export function formatTodoRelatedField(field: string): string {
  return field.replace(/([A-Z])/g, " $1").trim();
}

export function filterTodos(todos: ToDoEntry[], filters: TodoRecordFilters): ToDoEntry[] {
  const q = filters.search.trim().toLowerCase();

  return todos.filter((todo) => {
    if (filters.severity !== "all" && todo.level !== filters.severity) return false;
    if (filters.module !== "all" && todo.module !== filters.module) return false;

    if (q) {
      const hay = `${todo.message} ${todo.module} ${todo.relatedField ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    return true;
  });
}

export function buildTodosAdminSummary(todos: ToDoEntry[]): TodosAdminSummary {
  const moduleMap = new Map<string, number>();
  let pendingInView = 0;
  let completedInView = 0;
  let criticalInView = 0;
  let warningInView = 0;
  let infoInView = 0;

  todos.forEach((todo) => {
    moduleMap.set(todo.module, (moduleMap.get(todo.module) || 0) + 1);

    if (todo.status === "pending") {
      pendingInView += 1;
      if (todo.level === "critical") criticalInView += 1;
      else if (todo.level === "warning") warningInView += 1;
      else if (todo.level === "info") infoInView += 1;
    } else {
      completedInView += 1;
    }
  });

  return {
    pendingInView,
    completedInView,
    criticalInView,
    warningInView,
    infoInView,
    moduleDistribution: Array.from(moduleMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value),
  };
}

export function getTodoModules(todos: ToDoEntry[]): string[] {
  return Array.from(new Set(todos.map((t) => t.module).filter(Boolean))).sort();
}

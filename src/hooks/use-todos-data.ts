import { useEffect, useState, useCallback } from "react"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"

type Todo = {
  id: string
  message: string
  level: string
  module: string
  action_url: string | null
  status: string
  assigned_user_id: string | null
  employee_id: string | null
  created_at: string | null
  updated_at: string | null
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type Options = {
  initialToDos?: Todo[];
  isMockDataEnabled?: boolean;
  isAuthenticated?: boolean;
  isLoadingAuth?: boolean;
};

type ToDoEntryMock = {
  id: string;
  message: string;
  level: "critical" | "warning" | "info" | string;
  module: string;
  actionUrl?: string | null;
  status: "pending" | "done" | string;
  assignedTo?: string | null;
  employeeId?: string | null;
  relatedField?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

function toSnake(todo: ToDoEntryMock): Todo {
  return {
    id: todo.id,
    message: todo.message,
    level: todo.level as string,
    module: todo.module,
    action_url: todo.actionUrl ?? null,
    status: todo.status as string,
    assigned_user_id: todo.assignedTo ?? null,
    employee_id: todo.employeeId ?? null,
    created_at: todo.createdAt ?? null,
    updated_at: todo.updatedAt ?? null,
  };
}

export function useTodosData(opts?: Options) {
  const { toast } = useToast()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTodos = useCallback(async () => {
    if (opts?.isMockDataEnabled) {
      const stored = localStorage.getItem("mockToDos");
      const parsed: any[] = stored ? JSON.parse(stored) : (opts.initialToDos ?? []);
      const normalized: Todo[] = parsed.map((t: any) =>
        "actionUrl" in t || "employeeId" in t ? toSnake(t as ToDoEntryMock) : (t as Todo)
      );
      setTodos(normalized);
      setLoading(false);
      return;
    }
    if (opts?.isLoadingAuth) {
      setLoading(true);
      return;
    }
    if (!opts?.isAuthenticated) {
      setTodos([]);
      setLoading(false);
      return;
    }
    setLoading(true)

    // Determine if user is Admin to decide query scope
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id ?? null;

    let isAdmin = false;
    if (uid) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", uid).maybeSingle();
      isAdmin = profile?.role === "Admin";
    }

    let query = supabase
      .from("todos")
      .select("id,message,level,module,action_url,status,assigned_user_id,employee_id,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (!isAdmin && uid) {
      // Limit to items assigned to or owned by the current user
      query = query.or(`assigned_user_id.eq.${uid},employee_id.eq.${uid}`);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Failed to load todos", description: error.message, variant: "destructive" })
    } else {
      setTodos((data as unknown as Todo[]) ?? [])
    }
    setLoading(false)
  }, [opts?.isMockDataEnabled, opts?.isAuthenticated, opts?.isLoadingAuth, opts?.initialToDos, toast])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  const markToDoAsDone = useCallback(async (id: string) => {
    if (opts?.isMockDataEnabled) {
      setTodos(prev => {
        const updated = prev.map(t => t.id === id ? { ...t, status: "done" } : t);
        localStorage.setItem("mockToDos", JSON.stringify(updated));
        window.dispatchEvent(new CustomEvent('toDosUpdated', { detail: updated }));
        return updated;
      });
      return;
    }
    const { error } = await supabase.from("todos").update({ status: "done" }).eq("id", id);
    if (error) {
      toast({ title: "Failed to update To-Do", description: error.message, variant: "destructive" })
    } else {
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: "done" } : t))
      window.dispatchEvent(new CustomEvent('toDosUpdated', { detail: todos }));
    }
  }, [opts?.isMockDataEnabled, toast, todos])

  const refetchToDos = useCallback(() => {
    fetchTodos();
  }, [fetchTodos])

  const pendingCount = todos.filter(t => t.status === "pending").length;

  return { todos, toDos: todos, loading, isLoadingToDos: loading, pendingCount, markToDoAsDone, refetchToDos }
}

export { useTodosData as useToDosData }
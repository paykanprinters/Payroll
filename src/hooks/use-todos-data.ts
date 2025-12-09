import { useEffect, useState } from "react"
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

export function useTodosData() {
  const { toast } = useToast()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      // RLS restricts to current user or admin; no client-provided role filter
      const { data, error } = await supabase
        .from("todos")
        .select("id,message,level,module,action_url,status,assigned_user_id,employee_id,created_at,updated_at")
        .order("created_at", { ascending: false })

      if (error) {
        toast({ title: "Failed to load todos", description: error.message, variant: "destructive" })
      } else if (active && data) {
        setTodos(data as unknown as Todo[])
      }
      setLoading(false)
    })()

    return () => { active = false }
  }, [toast])

  return { todos, loading }
}

export { useTodosData as useToDosData }
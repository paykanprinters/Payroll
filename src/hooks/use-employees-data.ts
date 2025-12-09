import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import { useToast } from "@/components/ui/use-toast"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type EmployeePreview = {
  id: string
  first_name: string
  last_name: string
  email: string
  job_title: string
  department: string | null
  start_date: string
}

export function useEmployeesData() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<EmployeePreview[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, email, job_title, department, start_date")
        .order("last_name", { ascending: true })
      if (error) {
        toast({ title: "Failed to load employees", description: error.message, variant: "destructive" })
      } else if (active && data) {
        setEmployees(data as EmployeePreview[])
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [toast])

  return { employees, loading }
}
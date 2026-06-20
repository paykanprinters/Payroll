-- Unique (employee_id, related_field) for generate-todos upsert (idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.todos'::regclass
      AND contype = 'u'
      AND (
        conname = 'unique_employee_field_todo'
        OR conname = 'unique_employee_todo'
      )
  ) THEN
    ALTER TABLE public.todos
    ADD CONSTRAINT unique_employee_field_todo UNIQUE (employee_id, related_field);
  END IF;
END $$;

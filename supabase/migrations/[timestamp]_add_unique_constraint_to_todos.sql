-- Add a unique constraint to the 'todos' table on 'employee_id' and 'related_field'
-- This is necessary for the 'upsert' operation in the 'generate-todos' Edge Function
-- to correctly identify conflicts and prevent duplicate To-Dos for the same employee field.

ALTER TABLE public.todos
ADD CONSTRAINT unique_employee_field_todo UNIQUE (employee_id, related_field);

-- Note: This migration assumes that 'employee_id' and 'related_field' can be NULL.
-- If they are NULL, the unique constraint will treat multiple NULLs as distinct values.
-- If you intend for (NULL, 'some_field') to be unique, or ('some_id', NULL) to be unique,
-- you might need a partial index or a different strategy.
-- For the current use case, where related_field is only present for employee-specific todos,
-- and general todos don't have employee_id/related_field, this constraint is appropriate.
-- General todos use the 'message' for uniqueness, which is handled by the existingToDoMap logic.
-- Cash-paid employees may omit tax reference / UIF numbers while still
-- optionally tracking PAYE/UIF for company tax totals (default ON).

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS track_tax boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.employees.track_tax IS
  'When true, PAYE/UIF are calculated and included in tax report totals. Cash-paid employees can omit tax reference and UIF numbers.';

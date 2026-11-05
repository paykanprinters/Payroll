alter table public.company_details add column if not exists journal_account_codes jsonb not null default '{}'::jsonb;
comment on column public.company_details.journal_account_codes is 'General ledger account code and name per payroll journal line, keyed by line id. Used by the payroll journal report.';

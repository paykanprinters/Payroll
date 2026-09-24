-- Retire stale tax / UIF / bank profile to-dos for cash-paid employees.
-- Cash payment mode does not require those fields; PAYE/UIF tracking is optional via track_tax.

UPDATE public.todos AS t
SET
  status = 'done',
  updated_at = now()
FROM public.employees AS e
WHERE t.employee_id = e.id
  AND e.payment_mode = 'Cash'
  AND t.status = 'pending'
  AND (
    t.related_field IN (
      'taxReferenceNumber',
      'tax_reference_number',
      'uifNumber',
      'uif_number',
      'bankName',
      'bank_name',
      'bankAccountHolder',
      'bank_account_holder',
      'accountNumber',
      'iban_number',
      'branchCode',
      'routing_swift_code'
    )
    OR t.message ILIKE '%tax reference%'
    OR t.message ILIKE '%uif number%'
    OR t.message ILIKE '%missing uif%'
    OR t.message ILIKE '%bank name%'
    OR t.message ILIKE '%bank account%'
    OR t.message ILIKE '%branch code%'
    OR t.message ILIKE '%account number%'
  );

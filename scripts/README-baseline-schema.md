# Baseline database schema

The earliest migration in `supabase/migrations/` is `20250101000000_baseline_schema.sql`. It captures the current **public** table definitions so a fresh Supabase project can be bootstrapped from git.

## Existing production / staging

Production already has these tables. The baseline migration uses `CREATE TABLE IF NOT EXISTS` and is safe to run — it no-ops when tables exist.

RLS policies, triggers, and security hardening remain in later dated migrations.

## Regenerate from live database

1. Export column metadata (Supabase SQL editor or CLI):

```sql
SELECT c.table_name, c.column_name, c.data_type, c.udt_name, c.is_nullable,
       c.column_default::text AS column_default, c.character_maximum_length,
       c.numeric_precision, c.numeric_scale
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;
```

2. Save the JSON array to `scripts/data/columns.json`.

3. Run:

```bash
node scripts/generate-baseline-schema.mjs scripts/data/columns.json
```

4. Commit the updated `20250101000000_baseline_schema.sql`.

## Notes

- Primary keys, foreign keys, and indexes are not included in the baseline file; add dedicated migrations when needed for new environments.
- Do not apply a regenerated baseline to production if it would drift from incremental migrations — treat it as a bootstrap artifact for new projects.

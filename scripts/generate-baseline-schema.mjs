#!/usr/bin/env node
/**
 * Generate supabase/migrations/20250101000000_baseline_schema.sql from JSON export(s)
 * of information_schema.columns (see scripts/README-baseline-schema.md).
 *
 * Usage:
 *   node scripts/generate-baseline-schema.mjs scripts/data/columns.json
 *   node scripts/generate-baseline-schema.mjs scripts/data/schema-batch-*.json
 */
import fs from "node:fs";
import path from "node:path";

/** @typedef {{
 *   table_name: string;
 *   column_name: string;
 *   data_type: string;
 *   udt_name: string;
 *   is_nullable: string;
 *   column_default: string | null;
 *   character_maximum_length: number | null;
 *   numeric_precision: number | null;
 *   numeric_scale: number | null;
 * }} ColumnRow */

/** @param {ColumnRow} row */
function pgType(row) {
  if (row.data_type === "USER-DEFINED") return row.udt_name;
  if (row.data_type === "ARRAY") return `${row.udt_name.replace(/^_/, "")}[]`;
  if (row.data_type === "character varying") {
    return row.character_maximum_length ? `varchar(${row.character_maximum_length})` : "varchar";
  }
  if (row.data_type === "numeric" && row.numeric_precision) {
    return row.numeric_scale != null
      ? `numeric(${row.numeric_precision},${row.numeric_scale})`
      : `numeric(${row.numeric_precision})`;
  }
  return row.data_type;
}

function main() {
  const inputs = process.argv.slice(2);
  if (inputs.length === 0) {
    console.error("Usage: node scripts/generate-baseline-schema.mjs <columns.json> [...]");
    process.exit(1);
  }

  /** @type {ColumnRow[]} */
  const rows = [];
  for (const inputPath of inputs) {
    const raw = fs.readFileSync(path.resolve(inputPath), "utf8");
    rows.push(...JSON.parse(raw));
  }

  const byTable = new Map();
  for (const row of rows) {
    if (!byTable.has(row.table_name)) byTable.set(row.table_name, []);
    byTable.get(row.table_name).push(row);
  }

  const lines = [
    "-- Baseline public schema for fresh Supabase projects.",
    "-- Generated from production metadata. Safe on existing DBs (IF NOT EXISTS).",
    "-- RLS policies, functions, and incremental changes live in later migrations.",
    "-- Regenerate: node scripts/generate-baseline-schema.mjs scripts/data/columns.json",
    "",
  ];

  for (const table of [...byTable.keys()].sort()) {
    const cols = byTable.get(table);
    lines.push(`CREATE TABLE IF NOT EXISTS public.${table} (`);
    const parts = cols.map((c) => {
      let def = `  ${c.column_name} ${pgType(c)}`;
      if (c.is_nullable === "NO") def += " NOT NULL";
      if (c.column_default != null) def += ` DEFAULT ${c.column_default}`;
      return def;
    });
    lines.push(parts.join(",\n"));
    lines.push(");");
    lines.push("");
  }

  const outPath = path.resolve("supabase/migrations/20250101000000_baseline_schema.sql");
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`Wrote ${byTable.size} tables to ${outPath}`);
}

main();

import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const [k, ...v] = l.split("=");
      return [k.trim(), v.join("=").trim().replace(/^["']|["']$/g, "")];
    })
);

const base = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

async function time(label, path) {
  const t0 = performance.now();
  const res = await fetch(`${base}/rest/v1/${path}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  await res.json();
  console.log(`${label.padEnd(22)} ${Math.round(performance.now() - t0)}ms (HTTP ${res.status})`);
}

console.log("Supabase REST round-trips (anon key, RLS may return empty/403)\n");
await time("employees (10 rows)", "employees?select=id&limit=10");
await time("timesheets (50 rows)", "timesheets?select=id&limit=50");
await time("payslips (20 rows)", "payslips?select=id&limit=20");
await time("saving_plans", "saving_plans?select=id&limit=20");
await time("company_details", "company_details?select=id&limit=1");

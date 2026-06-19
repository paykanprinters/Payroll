/** Cold-download timing for lazy route chunks (production build via preview). */
import { performance } from "node:perf_hooks";
import { readdirSync } from "node:fs";
import { join } from "node:path";

const PREVIEW = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:4173";

const ROUTE_CHUNKS = {
  Dashboard: "RootHome",
  "To-Dos": "ToDosPage",
  Employees: "Employees",
  Timesheet: "Timesheet",
  Savings: "Savings",
  Loans: "LoansAndAdvancements",
  Payslips: "Payslips",
  "Payroll Runs": "PayrollRuns",
  Analytics: "Analytics",
  Reports: "Reports",
  Settings: "Settings",
};

async function measureChunk(baseUrl, file) {
  const url = `${baseUrl}/assets/${file}`;
  const t0 = performance.now();
  const res = await fetch(url, { cache: "no-store" });
  const buf = await res.arrayBuffer();
  return {
    file,
    ms: Math.round(performance.now() - t0),
    kb: Math.round(buf.byteLength / 1024),
    ok: res.ok,
  };
}

async function main() {
  const assetsDir = join(process.cwd(), "dist", "assets");
  const files = readdirSync(assetsDir).filter((f) => f.endsWith(".js"));

  console.log(`Chunk download lag @ ${PREVIEW} (no-store, single connection)\n`);
  console.log("Route".padEnd(16), "KB".padStart(8), "Download".padStart(10));
  console.log("-".repeat(36));

  for (const [route, prefix] of Object.entries(ROUTE_CHUNKS)) {
    const file = files.find((f) => f.startsWith(prefix + "-"));
    if (!file) {
      console.log(route.padEnd(16), "—".padStart(8), "missing".padStart(10));
      continue;
    }
    const r = await measureChunk(PREVIEW, file);
    console.log(route.padEnd(16), String(r.kb).padStart(8), `${r.ms}ms`.padStart(10));
  }

  const shared = ["index-", "use-data-visuals", "use-pdf-vector", "calendar", "select-"];
  console.log("\nHeavy shared deps (load once, amortized across tabs):");
  for (const prefix of shared) {
    const file = files.find((f) => f.startsWith(prefix));
    if (!file) continue;
    const r = await measureChunk(PREVIEW, file);
    console.log(`  ${file}: ${r.kb} KB, ${r.ms}ms`);
  }
}

main().catch(console.error);

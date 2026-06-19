/**
 * Measures sidebar tab navigation lag (chunk load + paint) on a running dev/preview server.
 * Usage: node scripts/measure-tab-lag.mjs [--url http://localhost:8081] [--email x] [--password y]
 */
import { chromium } from "playwright";
import { performance } from "node:perf_hooks";

const BASE_URL = process.argv.includes("--url")
  ? process.argv[process.argv.indexOf("--url") + 1]
  : "http://localhost:8081";

const EMAIL = process.argv.includes("--email")
  ? process.argv[process.argv.indexOf("--email") + 1]
  : process.env.PAYROLL_TEST_EMAIL;

const PASSWORD = process.argv.includes("--password")
  ? process.argv[process.argv.indexOf("--password") + 1]
  : process.env.PAYROLL_TEST_PASSWORD;

const ROUTES = [
  { label: "Dashboard", path: "/dashboard", marker: "Dashboard" },
  { label: "To-Dos", path: "/todos", marker: "To-Do" },
  { label: "Employees", path: "/employees", marker: "Employee" },
  { label: "Timesheet", path: "/timesheet", marker: "Timesheet" },
  { label: "Vacation", path: "/vacation-absence", marker: "Vacation" },
  { label: "Savings", path: "/savings", marker: "Savings" },
  { label: "Loans", path: "/loans-advancements", marker: "Loan" },
  { label: "Payslips", path: "/payslips/overview", marker: "Payslip" },
  { label: "Payroll Runs", path: "/payroll/runs", marker: "Payroll Run" },
  { label: "Analytics", path: "/analytics", marker: "Analytics" },
  { label: "Reports", path: "/reports", marker: "Report" },
  { label: "Settings", path: "/settings", marker: "Settings" },
];

async function login(page) {
  if (!EMAIL || !PASSWORD) return false;
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("Your email address").fill(EMAIL);
  await page.getByPlaceholder("Your password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 20000 });
  return true;
}

async function measureRoute(page, route, pass) {
  const t0 = performance.now();
  await page.goto(`${BASE_URL}${route.path}`, { waitUntil: "domcontentloaded" });

  // Wait for Suspense spinner to disappear OR a route-specific heading/text
  try {
    await page.locator("text=Loading company data").waitFor({ state: "hidden", timeout: 15000 });
  } catch {
    /* optional banner */
  }

  try {
    await page.locator(".animate-spin").first().waitFor({ state: "hidden", timeout: 15000 });
  } catch {
    /* no spinner */
  }

  try {
    await page.getByText(new RegExp(route.marker, "i")).first().waitFor({ timeout: 15000 });
  } catch {
    /* fallback to network idle */
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  }

  const elapsed = Math.round(performance.now() - t0);

  const resources = await page.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((r) => r.initiatorType === "script" && r.name.includes("/assets/"))
      .map((r) => ({
        name: r.name.split("/").pop(),
        ms: Math.round(r.duration),
        transferKb: Math.round((r.transferSize || 0) / 1024),
      }))
  );

  const newChunks = resources.filter((r) => r.ms > 0).slice(-5);

  return { pass, route: route.label, path: route.path, ms: elapsed, newChunks };
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const loggedIn = await login(page);
  if (!loggedIn) {
    console.error(
      "No credentials — cannot measure authenticated tab lag.\n" +
        "Set PAYROLL_TEST_EMAIL/PAYROLL_TEST_PASSWORD or pass --email/--password.\n" +
        "Run `node scripts/measure-chunk-load.mjs` for lazy-chunk timing without login.\n"
    );
    await browser.close();
    process.exit(1);
  }

  console.log(`Logged in as ${EMAIL}\n`);

  const results = [];
  for (const route of ROUTES) {
    const cold = await measureRoute(page, route, "cold");
    results.push(cold);
    const warm = await measureRoute(page, route, "warm");
    results.push(warm);
  }

  console.log("\nTab navigation lag (ms until route marker visible)\n");
  console.log("Route".padEnd(16), "Cold".padStart(8), "Warm".padStart(8), "Δ".padStart(8));
  console.log("-".repeat(44));

  for (const route of ROUTES) {
    const cold = results.find((r) => r.route === route.label && r.pass === "cold");
    const warm = results.find((r) => r.route === route.label && r.pass === "warm");
    const delta = warm.ms - cold.ms;
    console.log(
      route.label.padEnd(16),
      String(cold.ms).padStart(8),
      String(warm.ms).padStart(8),
      String(delta >= 0 ? `+${delta}` : delta).padStart(8)
    );
  }

  const slowest = [...results]
    .filter((r) => r.pass === "cold")
    .sort((a, b) => b.ms - a.ms)
    .slice(0, 5);
  console.log("\nSlowest cold loads:");
  for (const r of slowest) {
    console.log(`  ${r.route}: ${r.ms}ms`);
    if (r.newChunks?.length) {
      console.log(`    chunks: ${r.newChunks.map((c) => `${c.name} (${c.ms}ms)`).join(", ")}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

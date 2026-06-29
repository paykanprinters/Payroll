// Generates a sample Bankserv (ACB) bank file from synthetic data using the
// EXACT production generator (src/lib/bank-disbursement). No database, no
// payroll run — handy for validating the file format against Absa Business Online.
//
// Usage:  npm run gen:acb-sample
// Output: ./tmp/sample-acb.txt
//
// It transpiles the TypeScript generator on the fly with esbuild (already a
// transitive dependency via vite/vitest), so there's nothing extra to install.

import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

async function loadGenerator() {
  const entry = resolve(repoRoot, "src/lib/bank-disbursement/bankserv-acb.ts");
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const tmpFile = join(tmpdir(), `acb-gen-${Date.now()}.mjs`);
  writeFileSync(tmpFile, result.outputFiles[0].text);
  return import(pathToFileURL(tmpFile).href);
}

const company = {
  branchCode: "632005",
  accountNumber: "1234567890",
  accountHolder: "Kan Printers",
  accountType: "Cheque",
};

const items = [
  { id: "1", employeeId: "1", employeeName: "Thandi Nkosi", netPay: 12500.0, accountHolder: "Thandi Nkosi", branchCode: "250655", accountNumber: "62011234567", bankAccountType: "Cheque", status: "Pending" },
  { id: "2", employeeId: "2", employeeName: "Sipho Dlamini", netPay: 9875.5, accountHolder: "Sipho Dlamini", branchCode: "632005", accountNumber: "4051234567", bankAccountType: "Savings", status: "Pending" },
  { id: "3", employeeId: "3", employeeName: "Lerato Mokoena", netPay: 15240.0, accountHolder: "Lerato Mokoena", branchCode: "470010", accountNumber: "1234567890", bankAccountType: "Cheque", status: "Pending" },
];

const { generateBankservAcbFile, countAcbRecords } = await loadGenerator();

const file = generateBankservAcbFile({
  company,
  items,
  options: {
    actionDate: new Date(),
    toReference: "SALARY",
    fromReference: "PAYROLL",
  },
});

const outDir = join(repoRoot, "tmp");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "sample-acb.txt");
writeFileSync(outFile, file, "utf8");

const total = items.reduce((s, i) => s + i.netPay, 0);
console.log("Sample Bankserv (ACB) file written:");
console.log("  " + outFile);
console.log(`  ${items.length} payments · R ${total.toFixed(2)} · ${countAcbRecords(file)} records`);
console.log("\nUpload this file to Absa Business Online's bulk-payment import to confirm it validates.");

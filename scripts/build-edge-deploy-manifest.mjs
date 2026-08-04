import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const functionsDir = path.join(root, "supabase", "functions");

/** Functions in repo: name -> verify_jwt (get-branding stays public). */
const FUNCTIONS = {
  "bootstrap-admins": true,
  "batch-upsert-timesheets": true,
  "confirm-user-email": true,
  "fetch-biometric-logs": true,
  "fetch-sars-tax-tables": true,
  "generate-todos": true,
  "get-auth-user-status": true,
  "get-branding": false,
  "seed-company-branding": true,
  "seed-users": true,
  "send-employee-welcome": true,
  "send-payroll-reminders": true,
  "send-payslip-email": true,
  "send-sms": true,
  "update-user-metadata": true,
  "update-user-password": true,
};

function readIfExists(relPath) {
  const full = path.join(functionsDir, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
}

function collectFiles(functionName) {
  const files = [];
  const entryCandidates = [
    path.join(functionName, "index.ts"),
    path.join(functionName, "index.tsx"),
  ];
  const entry = entryCandidates.find((rel) =>
    fs.existsSync(path.join(functionsDir, rel))
  );
  if (!entry) {
    throw new Error(`No entrypoint for ${functionName}`);
  }
  files.push({ name: entry.replace(/\\/g, "/"), content: readIfExists(entry) });

  for (const shared of [
    "_shared/cors.ts",
    "_shared/url-security.ts",
    "_shared/sars-tax-tables.ts",
    "_shared/resend.ts",
    "_shared/email-templates.ts",
    "_shared/smsportal.ts",
    "_shared/sms-templates.ts",
    "_shared/template-engine.ts",
  ]) {
    const content = readIfExists(shared);
    if (content) files.push({ name: shared, content });
  }

  return { entrypoint_path: entry.replace(/\\/g, "/"), files };
}

const manifest = Object.fromEntries(
  Object.entries(FUNCTIONS).map(([name, verify_jwt]) => {
    const { entrypoint_path, files } = collectFiles(name);
    return [name, { verify_jwt, entrypoint_path, files }];
  })
);

const outPath = path.join(root, "scripts", "edge-deploy-manifest.json");
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log(`Wrote ${outPath} (${Object.keys(manifest).length} functions)`);

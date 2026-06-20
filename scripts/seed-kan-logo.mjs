#!/usr/bin/env node
/**
 * Upload Kan Printers logo to Supabase Storage and sync company + payslip design settings.
 *
 * Preferred (no password):
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-kan-logo.mjs
 *
 * Alternative (Admin JWT via edge function):
 *   SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node scripts/seed-kan-logo.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(path.join(root, ".env"));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL;
const password = process.env.SEED_ADMIN_PASSWORD;
const logoFile =
  process.env.SEED_LOGO_FILE ||
  path.join(root, "public", "brand", "kanprinters_horizontal_color.png");

const BUCKET = "company-logos";
const OBJECT_PATH = "company_logo.png";
const COMPANY_ID = "00000000-0000-0000-0000-000000000000";
const LOGO_WIDTH = 180;
const LOGO_HEIGHT = 60;
const LOGO_FIT = "contain";

if (!supabaseUrl) {
  console.error("Missing VITE_SUPABASE_URL in .env");
  process.exit(1);
}

if (!fs.existsSync(logoFile)) {
  console.error(`Logo file not found: ${logoFile}`);
  process.exit(1);
}

const logoBytes = fs.readFileSync(logoFile);

async function syncDatabase(admin, logoUrl) {
  const { error: companyError } = await admin.from("company_details").upsert(
    {
      id: COMPANY_ID,
      logourl: logoUrl,
      logowidth: LOGO_WIDTH,
      logoheight: LOGO_HEIGHT,
      logofit: LOGO_FIT,
    },
    { onConflict: "id" }
  );
  if (companyError) throw companyError;

  const { error: designError } = await admin
    .from("payslip_design_settings")
    .update({
      payslip_logo_url: logoUrl,
      payslip_logo_width: LOGO_WIDTH,
      payslip_logo_height: LOGO_HEIGHT,
      payslip_logo_fit: LOGO_FIT,
      show_company_logo: true,
    })
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (designError) throw designError;

  return { logoUrl, logoWidth: LOGO_WIDTH, logoHeight: LOGO_HEIGHT, logoFit: LOGO_FIT };
}

async function seedWithServiceRole() {
  if (!serviceRoleKey) return null;

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error: uploadError } = await admin.storage.from(BUCKET).upload(OBJECT_PATH, logoBytes, {
    upsert: true,
    contentType: "image/png",
    cacheControl: "3600",
  });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);
  const result = await syncDatabase(admin, publicUrlData.publicUrl);
  return { ...result, bytesUploaded: logoBytes.byteLength, method: "service_role" };
}

async function seedWithAdminFunction() {
  if (!anonKey || !email || !password) return null;

  const supabase = createClient(supabaseUrl, anonKey);
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError || !signIn.session) throw signInError || new Error("No session");

  const fnUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/seed-company-branding`;
  const response = await fetch(fnUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${signIn.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ logoBase64: logoBytes.toString("base64") }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(JSON.stringify(payload));
  return { ...payload, method: "edge_function" };
}

try {
  const result = (await seedWithServiceRole()) ?? (await seedWithAdminFunction());
  if (!result) {
    console.error(
      "Set SUPABASE_SERVICE_ROLE_KEY or SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD to seed the Kan logo."
    );
    process.exit(1);
  }
  console.log("Kan logo seeded successfully:");
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}

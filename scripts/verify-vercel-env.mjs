/**
 * Fail Vercel builds when Supabase env vars are missing.
 * Vite inlines VITE_* at build time — a deploy without them yields a blank site.
 */
const isVercel = Boolean(process.env.VERCEL);

if (!isVercel) {
  process.exit(0);
}

const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
const missing = required.filter((key) => !process.env[key]?.trim());

if (missing.length === 0) {
  console.log("verify-vercel-env: OK —", required.join(", "));
  process.exit(0);
}

console.error(
  "\nverify-vercel-env: BUILD FAILED\n" +
    `Missing on Vercel: ${missing.join(", ")}\n\n` +
    "Fix: Vercel → Project → Settings → Environment Variables\n" +
    "  • VITE_SUPABASE_URL = https://<project-ref>.supabase.co\n" +
    "  • VITE_SUPABASE_ANON_KEY = <anon key from Supabase dashboard>\n" +
    "Enable for Production + Preview, then redeploy.\n"
);
process.exit(1);

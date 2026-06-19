/** Vite env vars (inlined at build time). Used for deploy diagnostics. */

export function getMissingViteEnvVars(): string[] {
  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL) missing.push("VITE_SUPABASE_URL");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY");
  return missing;
}

export function isSupabaseEnvConfigured(): boolean {
  return getMissingViteEnvVars().length === 0;
}

export function getDeploymentConfigMessage(): string | null {
  const missing = getMissingViteEnvVars();
  if (missing.length === 0) return null;
  return (
    `Missing required environment variable(s): ${missing.join(", ")}. ` +
    "In Vercel, open Project → Settings → Environment Variables, add them for Production and Preview, then redeploy. " +
    "Vite bakes VITE_* values into the build — changing env vars requires a new deployment."
  );
}

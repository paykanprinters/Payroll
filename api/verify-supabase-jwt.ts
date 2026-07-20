import { createClient } from "@supabase/supabase-js";

function getSupabaseUrl(): string | undefined {
  return (
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    undefined
  );
}

function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    undefined
  );
}

/** Validate a Supabase access token; returns the authenticated user id or null. */
export async function verifySupabaseAccessToken(bearerHeader: string | undefined): Promise<string | null> {
  if (!bearerHeader?.startsWith("Bearer ")) return null;

  const token = bearerHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!url || !anonKey) {
    console.error("verifySupabaseAccessToken: missing SUPABASE_URL / SUPABASE_ANON_KEY");
    return null;
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

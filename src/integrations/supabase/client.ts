import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseEnvConfigured } from '@/lib/env';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export { isSupabaseEnvConfigured };

const DEFAULT_TIMEOUT_MS = 20000;

function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit) {
  const timeoutMs = DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  if (init?.signal) {
    try {
      if (init.signal.aborted) {
        controller.abort();
      } else {
        init.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }
    } catch {
      // ignore
    }
  }

  return fetch(input, {
    ...init,
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timeoutId));
}

let supabaseInstance: SupabaseClient | null = null;

function getConfiguredClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on Vercel and redeploy.'
    );
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: fetchWithTimeout },
    });
  }
  return supabaseInstance;
}

export function requireSupabase(): SupabaseClient {
  return getConfiguredClient();
}

/** Typed client; App.tsx shows a config screen before any route uses this when env is missing. */
export const supabase: SupabaseClient = isSupabaseEnvConfigured()
  ? getConfiguredClient()
  : new Proxy({} as SupabaseClient, {
      get(_target, prop) {
        const client = getConfiguredClient();
        const value = Reflect.get(client, prop, client);
        return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
      },
    });

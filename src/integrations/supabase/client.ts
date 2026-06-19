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

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function globalFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = resolveFetchUrl(input);
  // Auth and edge functions must not share the data-layer abort wrapper.
  if (url.includes("/auth/v1/") || url.includes("/functions/v1/")) {
    return fetch(input, init);
  }
  return fetchWithTimeout(input, init);
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
      global: { fetch: globalFetch },
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

import { createClient } from "@supabase/supabase-js";

/** Strip quotes/whitespace; hosted `*.supabase.co` URLs must be origin only (no `/rest/v1` path). */
export function normalizeSupabaseProjectUrl(raw) {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim().replace(/^["']|["']$/g, "");
  s = s.replace(/\/+$/, "");
  try {
    const url = new URL(s);
    if (url.hostname.endsWith(".supabase.co")) {
      return `${url.protocol}//${url.hostname}`;
    }
  } catch {
    return "";
  }
  return s;
}

/**
 * Must match an entry under Supabase → Authentication → URL Configuration (Site URL or Redirect URLs).
 * Use the site root unless `VITE_AUTH_SITE_URL` is set to an exact allowed URL (e.g. production).
 */
export function getAuthSiteRedirectUrl() {
  const explicit = import.meta.env.VITE_AUTH_SITE_URL?.trim().replace(/^["']|["']$/g, "");
  if (explicit) return explicit.replace(/\/+$/, "") || explicit;
  if (typeof window !== "undefined") return window.location.origin.replace(/\/+$/, "");
  return "";
}

const supabaseUrl = normalizeSupabaseProjectUrl(import.meta.env.VITE_SUPABASE_URL ?? "");
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim().replace(/^["']|["']$/g, "");

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Singleton browser client (anon key). Null when env vars are missing. */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy app/.env.example to app/.env and fill values from the Supabase dashboard."
  );
}

/**
 * @returns {import("@supabase/supabase-js").SupabaseClient}
 */
export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see app/.env.example)."
    );
  }
  return supabase;
}

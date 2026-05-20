import { collectClientLoginContext } from "../utils/clientLoginContext.js";
import { requireSupabase } from "./supabase.js";

/**
 * Login activity flow (after Supabase Auth success + valid profile):
 *
 * 1. Frontend: signInWithPassword succeeds
 * 2. Prefer Edge Function (server captures IP from request headers)
 * 3. Fallback: RPC `log_login_activity` (security definer)
 *
 * Timestamp is set by the database (`login_at default now()`).
 * Location is not stored on `login_activities`; use timezone from client as a hint in Edge Function body only.
 *
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function logLoginActivity() {
  const client = requireSupabase();
  const context = collectClientLoginContext();

  const edgeFunctionName = import.meta.env.VITE_LOGIN_ACTIVITY_FUNCTION?.trim();

  if (edgeFunctionName) {
    const { error } = await client.functions.invoke(edgeFunctionName, {
      body: {
        user_agent: context.user_agent,
        device_type: context.device_type,
        browser: context.browser,
        timezone: context.timezone,
        language: context.language,
      },
    });

    if (!error) {
      return { ok: true };
    }

    console.warn("[auth] login activity edge function failed, falling back to RPC", error.message);
  }

  const { error } = await client.rpc("log_login_activity", {
    p_ip_address: null,
    p_user_agent: context.user_agent,
    p_device_type: context.device_type,
    p_browser: context.browser,
  });

  if (error) {
    console.warn("[auth] log_login_activity RPC failed", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

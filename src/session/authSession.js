import { ref } from "vue";
import { supabase, isSupabaseConfigured } from "../services/supabase.js";

/** Current Supabase auth user, or null. */
export const authUser = ref(null);

/** True until the first `getSession` completes when Supabase is configured. */
export const authReady = ref(!isSupabaseConfigured);

/**
 * Restores session from storage and subscribes to auth changes.
 * @returns {() => void} cleanup (unsubscribe)
 */
export function initSupabaseAuth() {
  if (!supabase) {
    authReady.value = true;
    return () => {};
  }

  supabase.auth.getSession().then(({ data: { session } }) => {
    authUser.value = session?.user ?? null;
    authReady.value = true;
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    authUser.value = session?.user ?? null;
  });

  return () => subscription.unsubscribe();
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

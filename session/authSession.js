/**
 * @deprecated Use `useAuth()` from `composables/useAuth.js` or `useAuthStore()` from `stores/auth.js`.
 */
import { useAuthStore } from "../stores/auth.js";

/** @deprecated */
export function initSupabaseAuth() {
  return useAuthStore().initAuthListener();
}

/** @deprecated */
export async function signOut() {
  await useAuthStore().signOut();
}

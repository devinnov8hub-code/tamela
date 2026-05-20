import { ROLE_ADMIN, ROLE_CLINICIAN, roleDashboardPath } from "../constants/roles.js";
import { isSupabaseConfigured } from "../services/supabase.js";
import { useAuthStore } from "../stores/auth.js";

/** @typedef {import('../constants/roles.js').AppRole} AppRole */

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @returns {boolean}
 */
export function isPublicAuthRoute(to) {
  return to.path.startsWith("/auth");
}

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @returns {AppRole | null}
 */
export function requiredRouteRole(to) {
  if (to.path.startsWith("/admin")) return ROLE_ADMIN;
  if (to.path.startsWith("/clinician")) return ROLE_CLINICIAN;
  return null;
}

/**
 * @param {import('vue-router').RouteLocationNormalized} to
 * @param {import('vue-router').RouteLocationNormalized} from
 * @returns {import('vue-router').RouteLocationRaw | true}
 */
export async function runNavigationGuards(to, from) {
  if (!isSupabaseConfigured) return true;

  const auth = useAuthStore();
  await auth.ensureBootstrapped();

  const isPublic = isPublicAuthRoute(to);
  const requiredRole = requiredRouteRole(to);

  if (isPublic) {
    if (auth.isAuthenticated) {
      return { path: roleDashboardPath(auth.role), replace: true };
    }
    return true;
  }

  if (!auth.isAuthenticated) {
    const expiredMessage = auth.consumeSessionExpiredMessage();
    return {
      name: "auth-login",
      query: {
        redirect: to.fullPath,
        ...(expiredMessage ? { reason: "session", message: expiredMessage } : {}),
      },
      replace: true,
    };
  }

  if (requiredRole && auth.role !== requiredRole) {
    return { path: roleDashboardPath(auth.role), replace: true };
  }

  return true;
}

/** @deprecated use runNavigationGuards */
export const checkAuth = runNavigationGuards;
/** @deprecated use runNavigationGuards */
export const checkRole = runNavigationGuards;
/** @deprecated use runNavigationGuards */
export const protectRoutesByRole = runNavigationGuards;

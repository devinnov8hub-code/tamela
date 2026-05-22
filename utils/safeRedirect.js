import { isAppRole, ROLE_ADMIN, ROLE_CLINICIAN, roleDashboardPath } from "../constants/roles.js";

/**
 * Only allow redirects within the user's role namespace.
 * @param {string | undefined} redirect
 * @param {import('../constants/roles.js').AppRole} role
 */
export function safePostAuthRedirect(redirect, role) {
  if (!isAppRole(role)) return roleDashboardPath(null);
  if (!redirect || typeof redirect !== "string" || !redirect.startsWith("/")) {
    return roleDashboardPath(role);
  }

  if (role === ROLE_ADMIN && redirect.startsWith("/admin")) return redirect;
  if (role === ROLE_CLINICIAN && redirect.startsWith("/clinician")) return redirect;

  return roleDashboardPath(role);
}

/** @typedef {'ADMIN' | 'CLINICIAN'} AppRole */

/** Matches Supabase enum `public.user_role` */
export const ROLE_ADMIN = "ADMIN";
export const ROLE_CLINICIAN = "CLINICIAN";

/** @type {AppRole[]} */
export const VALID_ROLES = [ROLE_ADMIN, ROLE_CLINICIAN];

/**
 * @param {unknown} value
 * @returns {value is AppRole}
 */
export function isAppRole(value) {
  return typeof value === "string" && VALID_ROLES.includes(/** @type {AppRole} */ (value));
}

/**
 * @param {AppRole | null | undefined} role
 * @returns {string}
 */
export function roleDashboardPath(role) {
  if (role === ROLE_ADMIN) return "/admin/dashboard";
  if (role === ROLE_CLINICIAN) return "/clinician/recording/fresh";
  return "/auth/login";
}

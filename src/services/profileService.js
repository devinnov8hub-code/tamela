import { requireSupabase } from "./supabase.js";

/**
 * @typedef {Object} HospitalSummary
 * @property {string} id
 * @property {string} name
 * @property {string | null} [logo_url]
 */

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {import('../constants/roles.js').AppRole} role
 * @property {string | null} [hospital_id]
 * @property {HospitalSummary | null} [hospitals]
 * @property {string | null} [firstname]
 * @property {string | null} [lastname]
 * @property {string | null} [email]
 * @property {string | null} [title]
 * @property {string | null} [specialty_id]
 * @property {string | null} [department_id]
 * @property {import('../constants/userStatus.js').typeof USER_STATUS_ACTIVE | import('../constants/userStatus.js').typeof USER_STATUS_SUSPENDED | null} [status]
 * @property {string | null} [created_by]
 * @property {string | null} [updated_by]
 * @property {string | null} [created_at]
 * @property {string | null} [updated_at]
 */

const PROFILE_SELECT = `
  id,
  role,
  hospital_id,
  firstname,
  lastname,
  email,
  title,
  specialty_id,
  department_id,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at,
  hospitals (
    id,
    name,
    logo_url
  )
`;

/**
 * @param {string} userId
 */
export async function fetchProfileByUserId(userId) {
  const client = requireSupabase();
  const { data, error } = await client.from("profiles").select(PROFILE_SELECT).eq("id", userId).maybeSingle();

  if (error) {
    return { profile: null, error };
  }

  if (!data?.role) {
    return { profile: null, error: null };
  }

  return { profile: /** @type {UserProfile} */ (data), error: null };
}

/**
 * @param {string} userId
 * @param {number} [maxAttempts]
 */
export async function waitForProfileByUserId(userId, maxAttempts = 8) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const { profile, error } = await fetchProfileByUserId(userId);
    if (error) return { profile: null, error };
    if (profile?.role) return { profile, error: null };
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return { profile: null, error: null };
}

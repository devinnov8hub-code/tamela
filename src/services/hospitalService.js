import { requireSupabase } from "./supabase.js";

/**
 * @typedef {Object} Hospital
 * @property {string} id
 * @property {string} name
 * @property {string | null} [logo_url]
 * @property {string | null} [created_by]
 * @property {string | null} [created_at]
 * @property {string | null} [updated_at]
 */

/**
 * @param {string} hospitalId
 */
export async function fetchHospitalById(hospitalId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("hospitals")
    .select("id, name, logo_url, created_by, created_at, updated_at")
    .eq("id", hospitalId)
    .maybeSingle();

  return { hospital: data ? /** @type {Hospital} */ (data) : null, error };
}

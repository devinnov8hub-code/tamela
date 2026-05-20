import { requireSupabase } from "./supabase.js";

/**
 * @typedef {Object} Department
 * @property {string} id
 * @property {string} name
 * @property {string} hospital_id
 */

/**
 * @param {string} hospitalId
 */
export async function fetchDepartmentsByHospital(hospitalId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("departments")
    .select("id, name, hospital_id, created_at")
    .eq("hospital_id", hospitalId)
    .order("name");

  return { departments: /** @type {Department[]} */ (data ?? []), error };
}

/**
 * @param {{ hospitalId: string, name: string, createdBy: string }} payload
 */
export async function createDepartment(payload) {
  const client = requireSupabase();
  const name = payload.name.trim();

  if (!name) {
    return { department: null, error: { message: "Department name is required." } };
  }

  const { data, error } = await client
    .from("departments")
    .insert({
      hospital_id: payload.hospitalId,
      name,
      created_by: payload.createdBy,
    })
    .select("id, name, hospital_id")
    .single();

  return { department: data ? /** @type {Department} */ (data) : null, error };
}

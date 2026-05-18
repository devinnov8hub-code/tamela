import { requireSupabase } from "./supabase.js";

/**
 * @typedef {Object} Specialty
 * @property {string} id
 * @property {string} name
 * @property {string} hospital_id
 */

/**
 * @param {string} hospitalId
 */
export async function fetchSpecialtiesByHospital(hospitalId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("specialties")
    .select("id, name, hospital_id, created_at")
    .eq("hospital_id", hospitalId)
    .order("name");

  return { specialties: /** @type {Specialty[]} */ (data ?? []), error };
}

/**
 * @param {{ hospitalId: string, name: string, createdBy: string }} payload
 */
export async function createSpecialty(payload) {
  const client = requireSupabase();
  const name = payload.name.trim();

  if (!name) {
    return { specialty: null, error: { message: "Specialty name is required." } };
  }

  const { data, error } = await client
    .from("specialties")
    .insert({
      hospital_id: payload.hospitalId,
      name,
      created_by: payload.createdBy,
    })
    .select("id, name, hospital_id")
    .single();

  if (error?.code === "23505") {
    return findSpecialtyByName(payload.hospitalId, name);
  }

  return { specialty: data ? /** @type {Specialty} */ (data) : null, error };
}

/**
 * @param {string} hospitalId
 * @param {string} name
 */
async function findSpecialtyByName(hospitalId, name) {
  const client = requireSupabase();
  const trimmed = name.trim();
  const { data, error } = await client
    .from("specialties")
    .select("id, name, hospital_id")
    .eq("hospital_id", hospitalId)
    .ilike("name", trimmed)
    .maybeSingle();

  return { specialty: data ? /** @type {Specialty} */ (data) : null, error };
}

/**
 * Resolve specialty by name for this hospital; insert if missing.
 *
 * @param {{ hospitalId: string, name: string, createdBy: string }} payload
 */
export async function findOrCreateSpecialty(payload) {
  const trimmed = payload.name?.trim();
  if (!trimmed) {
    return { specialty: null, error: null };
  }

  const existing = await findSpecialtyByName(payload.hospitalId, trimmed);
  if (existing.error) {
    return existing;
  }
  if (existing.specialty) {
    return existing;
  }

  return createSpecialty({
    hospitalId: payload.hospitalId,
    name: trimmed,
    createdBy: payload.createdBy,
  });
}

/** @deprecated Use fetchSpecialtiesByHospital */
export async function fetchSpecialties() {
  return { specialties: [], error: { message: "Use fetchSpecialtiesByHospital(hospitalId)." } };
}

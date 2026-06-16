import { ROLE_CLINICIAN } from "../constants/roles.js";
import { USER_STATUS_ACTIVE, USER_STATUS_SUSPENDED } from "../constants/userStatus.js";
import { requireSupabase } from "./supabase.js";
import { profileDisplayName } from "../utils/profileDisplay.js";

const CLINICIAN_SELECT = `
  id,
  firstname,
  lastname,
  email,
  title,
  status,
  department_id,
  specialty_id,
  created_at
`;

/**
 * @param {string} hospitalId
 */
async function fetchNameMapsForHospital(hospitalId) {
  const client = requireSupabase();
  const [departmentsResult, specialtiesResult] = await Promise.all([
    client.from("departments").select("id, name").eq("hospital_id", hospitalId),
    client.from("specialties").select("id, name").eq("hospital_id", hospitalId),
  ]);

  const departmentNames = /** @type {Record<string, string>} */ ({});
  for (const row of departmentsResult.data ?? []) {
    if (row.id) departmentNames[row.id] = row.name;
  }

  const specialtyNames = /** @type {Record<string, string>} */ ({});
  for (const row of specialtiesResult.data ?? []) {
    if (row.id) specialtyNames[row.id] = row.name;
  }

  return { departmentNames, specialtyNames };
}

/**
 * @param {string} hospitalId
 */
export async function fetchCliniciansByHospital(hospitalId) {
  const client = requireSupabase();
  const [{ data, error }, { departmentNames, specialtyNames }] = await Promise.all([
    client
      .from("profiles")
      .select(CLINICIAN_SELECT)
      .eq("hospital_id", hospitalId)
      .eq("role", ROLE_CLINICIAN)
      .order("created_at", { ascending: false }),
    fetchNameMapsForHospital(hospitalId),
  ]);

  if (error) {
    return { clinicians: [], error };
  }

  const clinicians = (data ?? []).map((row) => mapClinicianRow(row, departmentNames, specialtyNames));
  const reportCounts = await fetchReportCountsByClinician(hospitalId);

  clinicians.forEach((clinician) => {
    clinician.reports = reportCounts[clinician.id] ?? 0;
  });

  return { clinicians, error: null };
}

/**
 * @param {string} hospitalId
 * @param {string} clinicianId
 */
export async function fetchClinicianById(hospitalId, clinicianId) {
  const client = requireSupabase();
  const [{ data, error }, { departmentNames, specialtyNames }] = await Promise.all([
    client
      .from("profiles")
      .select(CLINICIAN_SELECT)
      .eq("id", clinicianId)
      .eq("hospital_id", hospitalId)
      .eq("role", ROLE_CLINICIAN)
      .maybeSingle(),
    fetchNameMapsForHospital(hospitalId),
  ]);

  if (error) {
    return { clinician: null, error };
  }

  if (!data) {
    return { clinician: null, error: null };
  }

  const clinician = mapClinicianRow(data, departmentNames, specialtyNames);
  const reportCounts = await fetchReportCountsByClinician(hospitalId);
  clinician.reports = reportCounts[clinician.id] ?? 0;

  return { clinician, error: null };
}

/**
 * @param {string} clinicianId
 */
export async function fetchLastLoginForUser(clinicianId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("login_activities")
    .select("login_at")
    .eq("user_id", clinicianId)
    .order("login_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { loginAt: null, error };
  }

  return { loginAt: data?.login_at ?? null, error: null };
}

/**
 * @param {string} hospitalId
 * @param {string} clinicianId
 */
export async function fetchDistinctPatientCount(hospitalId, clinicianId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("reports")
    .select("case_title")
    .eq("hospital_id", hospitalId)
    .eq("clinician_id", clinicianId);

  if (error || !data) {
    return { count: 0, error };
  }

  const titles = new Set(
    data.map((row) => row.case_title?.trim().toLowerCase()).filter(Boolean)
  );

  return { count: titles.size, error: null };
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, string>} departmentNames
 * @param {Record<string, string>} specialtyNames
 */
function mapClinicianRow(row, departmentNames, specialtyNames) {
  const id = String(row.id);
  const status = row.status === USER_STATUS_SUSPENDED ? "suspended" : "active";
  const departmentId = row.department_id ?? null;
  const specialtyId = row.specialty_id ?? null;

  return {
    id,
    name: formatClinicianName(row),
    firstname: row.firstname ?? "",
    lastname: row.lastname ?? "",
    title: row.title ?? "",
    email: row.email ?? "",
    employeeId: `CL-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
    department: (departmentId && departmentNames[departmentId]) || "—",
    departmentId,
    specialty: (specialtyId && specialtyNames[specialtyId]) || "—",
    specialtyId,
    reports: 0,
    status,
    rawStatus: row.status,
    createdAt: row.created_at ?? null,
  };
}

/**
 * @param {{
 *   hospitalId: string,
 *   clinicianId: string,
 *   firstname: string,
 *   lastname: string,
 *   title?: string,
 *   email: string,
 *   departmentId?: string | null,
 *   specialtyId?: string | null,
 *   updatedBy: string,
 * }} payload
 */
export async function updateClinicianProfile(payload) {
  const client = requireSupabase();
  const firstname = payload.firstname.trim();
  const lastname = payload.lastname.trim();
  const email = payload.email.trim();

  if (!firstname || !lastname) {
    return { clinician: null, error: { message: "First and last name are required." } };
  }

  if (!email) {
    return { clinician: null, error: { message: "Email is required." } };
  }

  const { data, error } = await client
    .from("profiles")
    .update({
      firstname,
      lastname,
      title: payload.title?.trim() || null,
      email,
      department_id: payload.departmentId || null,
      specialty_id: payload.specialtyId || null,
      updated_by: payload.updatedBy,
    })
    .eq("id", payload.clinicianId)
    .eq("hospital_id", payload.hospitalId)
    .eq("role", ROLE_CLINICIAN)
    .select(CLINICIAN_SELECT)
    .single();

  if (error) {
    return { clinician: null, error };
  }

  const { departmentNames, specialtyNames } = await fetchNameMapsForHospital(payload.hospitalId);
  const clinician = mapClinicianRow(data, departmentNames, specialtyNames);

  return { clinician, error: null };
}

/**
 * @param {Record<string, unknown>} row
 */
function formatClinicianName(row) {
  const title = typeof row.title === "string" && row.title.trim() ? `${row.title.trim()}.` : "";
  const base = profileDisplayName(
    { firstname: row.firstname, lastname: row.lastname, email: row.email },
    "Clinician"
  );
  return title ? `${title} ${base}` : base;
}

/**
 * @param {string} hospitalId
 */
async function fetchReportCountsByClinician(hospitalId) {
  const client = requireSupabase();
  const { data, error } = await client.from("reports").select("clinician_id").eq("hospital_id", hospitalId);

  if (error || !data) return {};

  return data.reduce((acc, row) => {
    if (!row.clinician_id) return acc;
    acc[row.clinician_id] = (acc[row.clinician_id] ?? 0) + 1;
    return acc;
  }, /** @type {Record<string, number>} */ ({}));
}

/**
 * @param {string} userId
 * @param {'ACTIVE' | 'SUSPENDED'} status
 * @param {{ hospitalId?: string, updatedBy?: string }} [options]
 */
export async function setClinicianStatus(userId, status, options = {}) {
  const client = requireSupabase();
  const { hospitalId, updatedBy } = options;

  if (status !== USER_STATUS_ACTIVE && status !== USER_STATUS_SUSPENDED) {
    return { ok: false, error: "Invalid status value." };
  }

  let updateQuery = client
    .from("profiles")
    .update({
      status,
      ...(updatedBy ? { updated_by: updatedBy } : {}),
    })
    .eq("id", userId)
    .eq("role", ROLE_CLINICIAN);

  if (hospitalId) {
    updateQuery = updateQuery.eq("hospital_id", hospitalId);
  }

  const { data, error } = await updateQuery.select("id, status").maybeSingle();

  if (!error && data) {
    return { ok: true };
  }

  const rpcName = status === USER_STATUS_SUSPENDED ? "suspend_user" : "activate_user";
  const { error: rpcError } = await client.rpc(rpcName, { target_user_id: userId });

  if (!rpcError) {
    return { ok: true };
  }

  const detail = error?.message || rpcError.message || "Could not update user status.";
  return { ok: false, error: detail };
}

/**
 * @param {{
 *   email: string,
 *   password: string,
 *   firstname: string,
 *   lastname: string,
 *   hospitalId: string,
 *   createdBy: string,
 *   title?: string,
 *   departmentId?: string,
 *   specialtyId?: string,
 * }} payload
 */
export async function inviteClinician(payload) {
  const client = requireSupabase();
  const functionName = import.meta.env.VITE_CLINICIAN_INVITE_FUNCTION?.trim();

  if (!functionName) {
    return {
      ok: false,
      error: "Clinician invite is not configured. Set VITE_CLINICIAN_INVITE_FUNCTION in .env.",
    };
  }

  const { data, error } = await client.functions.invoke(functionName, {
    body: {
      email: payload.email.trim(),
      password: payload.password,
      role: ROLE_CLINICIAN,
      firstname: payload.firstname.trim(),
      lastname: payload.lastname.trim(),
      hospital_id: payload.hospitalId,
      created_by: payload.createdBy,
      title: payload.title?.trim() || null,
      department_id: payload.departmentId || null,
      specialty_id: payload.specialtyId || null,
    },
  });

  if (error) {
    const detail =
      typeof data?.error === "string"
        ? data.error
        : data?.message && typeof data.message === "string"
          ? data.message
          : error.message;
    return { ok: false, error: detail };
  }

  if (data && typeof data === "object" && "error" in data && data.error) {
    return { ok: false, error: String(data.error) };
  }

  return { ok: true, data };
}

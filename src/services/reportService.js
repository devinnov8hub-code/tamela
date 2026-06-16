import { ROLE_CLINICIAN } from "../constants/roles.js";
import { USER_STATUS_ACTIVE, USER_STATUS_SUSPENDED } from "../constants/userStatus.js";
import { requireSupabase } from "./supabase.js";
import { profileDisplayName } from "../utils/profileDisplay.js";

const REPORT_ROW_SELECT = `
  id,
  report_id,
  case_title,
  session_type,
  status,
  created_at,
  clinician_id,
  department_id,
  hospital_id
`;

/**
 * @param {string | null | undefined} status
 */
export function mapReportStatusUi(status) {
  const value = typeof status === "string" ? status.toUpperCase() : "";
  if (value === "COMPLETED") return "completed";
  if (value === "PROCESSING") return "processing";
  if (value === "DRAFT") return "pending";
  return "pending";
}

/**
 * @param {string} hospitalId
 */
async function fetchDepartmentNameMap(hospitalId) {
  const client = requireSupabase();
  const { data } = await client.from("departments").select("id, name").eq("hospital_id", hospitalId);
  const map = /** @type {Record<string, string>} */ ({});
  for (const row of data ?? []) {
    if (row.id) map[row.id] = row.name;
  }
  return map;
}

/**
 * @param {string[]} clinicianIds
 */
async function fetchClinicianProfileMap(clinicianIds) {
  const client = requireSupabase();
  const unique = [...new Set(clinicianIds.filter(Boolean))];
  if (!unique.length) return {};

  const { data } = await client
    .from("profiles")
    .select("id, firstname, lastname, email, title")
    .in("id", unique);

  const map = /** @type {Record<string, Record<string, unknown>>} */ ({});
  for (const row of data ?? []) {
    map[row.id] = row;
  }
  return map;
}

/**
 * @param {Record<string, unknown>} row
 * @param {Record<string, string>} departmentNames
 * @param {Record<string, Record<string, unknown>>} clinicianProfiles
 */
function mapReportRow(row, departmentNames, clinicianProfiles) {
  const clinicianId = row.clinician_id ? String(row.clinician_id) : "";
  const profile = clinicianProfiles[clinicianId];
  const departmentId = row.department_id ?? null;

  return {
    id: String(row.id),
    clinicianId,
    clinicianName: profile
      ? formatClinicianLabel(profile)
      : "Unknown clinician",
    email: profile?.email ?? "",
    caseTitle: row.case_title ?? "—",
    reportId: row.report_id ?? "—",
    sessionType: row.session_type ?? "—",
    department: (departmentId && departmentNames[departmentId]) || "—",
    departmentId,
    status: mapReportStatusUi(row.status),
    rawStatus: row.status,
    createdAt: row.created_at ?? null,
  };
}

/**
 * @param {Record<string, unknown>} profile
 */
function formatClinicianLabel(profile) {
  const title = typeof profile.title === "string" && profile.title.trim() ? `${profile.title.trim()}.` : "";
  const base = profileDisplayName(
    { firstname: profile.firstname, lastname: profile.lastname, email: profile.email },
    "Clinician"
  );
  return title ? `${title} ${base}` : base;
}

/**
 * @param {string} hospitalId
 */
export async function fetchReportsByHospital(hospitalId) {
  const client = requireSupabase();
  const [{ data, error }, departmentNames] = await Promise.all([
    client
      .from("reports")
      .select(REPORT_ROW_SELECT)
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false }),
    fetchDepartmentNameMap(hospitalId),
  ]);

  if (error) {
    return { reports: [], error };
  }

  const clinicianProfiles = await fetchClinicianProfileMap(
    (data ?? []).map((row) => String(row.clinician_id ?? ""))
  );

  const reports = (data ?? []).map((row) => mapReportRow(row, departmentNames, clinicianProfiles));
  return { reports, error: null };
}

/**
 * @param {string} hospitalId
 * @param {string} clinicianId
 */
export async function fetchReportsForClinician(hospitalId, clinicianId) {
  const client = requireSupabase();
  const [{ data, error }, departmentNames] = await Promise.all([
    client
      .from("reports")
      .select(REPORT_ROW_SELECT)
      .eq("hospital_id", hospitalId)
      .eq("clinician_id", clinicianId)
      .order("created_at", { ascending: false }),
    fetchDepartmentNameMap(hospitalId),
  ]);

  if (error) {
    return { reports: [], error };
  }

  const clinicianProfiles = await fetchClinicianProfileMap([clinicianId]);
  const reports = (data ?? []).map((row) => mapReportRow(row, departmentNames, clinicianProfiles));
  return { reports, error: null };
}

/**
 * @param {string} hospitalId
 * @param {string} reportId
 */
export async function fetchReportById(hospitalId, reportId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("reports")
    .select(REPORT_ROW_SELECT)
    .eq("hospital_id", hospitalId)
    .eq("id", reportId)
    .maybeSingle();

  if (error) {
    return { report: null, error };
  }

  if (!data) {
    return { report: null, error: null };
  }

  const [departmentNames, clinicianProfiles] = await Promise.all([
    fetchDepartmentNameMap(hospitalId),
    fetchClinicianProfileMap([String(data.clinician_id ?? "")]),
  ]);

  return {
    report: mapReportRow(data, departmentNames, clinicianProfiles),
    error: null,
  };
}

/**
 * @param {unknown} error
 */
export function formatSupabaseError(error) {
  if (!error) return "Unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null) {
    const row = /** @type {{ message?: string, details?: string, hint?: string }} */ (error);
    return [row.message, row.details, row.hint].filter(Boolean).join(" — ") || "Request failed";
  }
  return String(error);
}

/**
 * @param {string} hospitalId
 * @param {string} reportId
 * @param {string} clinicianId
 */
export async function deleteReportById(hospitalId, reportId, clinicianId) {
  const client = requireSupabase();

  const { data: existing, error: fetchError } = await client
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("hospital_id", hospitalId)
    .eq("clinician_id", clinicianId)
    .maybeSingle();

  if (fetchError) {
    return { error: fetchError };
  }

  if (!existing) {
    return { error: { message: "Report not found." } };
  }

  const { data: deletedTranscriptions, error: transcriptionError } = await client
    .from("report_transcriptions")
    .delete()
    .eq("report_id", reportId)
    .select("id");

  if (transcriptionError) {
    return { error: transcriptionError };
  }

  const { data: deletedReports, error: reportError } = await client
    .from("reports")
    .delete()
    .eq("id", reportId)
    .select("id");

  if (reportError) {
    return { error: reportError };
  }

  if (!deletedReports?.length) {
    return {
      error: {
        message:
          "Report could not be deleted. Your account may not have delete permission — ask an admin to apply the latest database policies.",
      },
    };
  }

  return { deleted: true, transcriptionRows: deletedTranscriptions?.length ?? 0 };
}

/**
 * @param {string} reportId
 */
export async function fetchReportTranscription(reportId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from("report_transcriptions")
    .select("id, report_id, transcription, formatted_transcription, created_at, updated_at")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { transcription: null, error };
  }

  return { transcription: data, error: null };
}

/**
 * @param {string} [transcription]
 */
export function deriveCaseTitleFromTranscription(transcription) {
  const trimmed = (transcription || "").trim();
  if (!trimmed) {
    return `Clinical session ${new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  const firstLine = trimmed.split(/\n/)[0].trim();
  if (firstLine.length <= 100) return firstLine;
  return `${firstLine.slice(0, 97)}...`;
}

export function generateReportId() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `RPT-${stamp}-${suffix}`;
}

/**
 * Persist a completed transcription to `reports` + `report_transcriptions`.
 * @param {{
 *   hospitalId: string,
 *   clinicianId: string,
 *   departmentId?: string | null,
 *   transcription: string,
 *   formattedTranscription?: unknown,
 *   sessionType?: string,
 *   caseTitle?: string,
 * }} payload
 */
export async function saveReportWithTranscription(payload) {
  const client = requireSupabase();
  const {
    hospitalId,
    clinicianId,
    departmentId = null,
    transcription,
    formattedTranscription = null,
    sessionType = "Live Recording",
    caseTitle,
  } = payload;

  const reportIdText = generateReportId();
  const title = caseTitle || deriveCaseTitleFromTranscription(transcription);

  const { data: report, error: reportError } = await client
    .from("reports")
    .insert({
      hospital_id: hospitalId,
      clinician_id: clinicianId,
      department_id: departmentId,
      report_id: reportIdText,
      case_title: title,
      session_type: sessionType,
      status: "COMPLETED",
      created_by: clinicianId,
      updated_by: clinicianId,
    })
    .select("id, report_id, case_title, session_type, status, created_at")
    .single();

  if (reportError) {
    return { report: null, error: reportError };
  }

  const { error: transcriptionError } = await client.from("report_transcriptions").insert({
    report_id: report.id,
    transcription,
    formatted_transcription: formattedTranscription,
    created_by: clinicianId,
    updated_by: clinicianId,
  });

  if (transcriptionError) {
    await client.from("reports").delete().eq("id", report.id);
    return { report: null, error: transcriptionError };
  }

  return {
    report: {
      id: String(report.id),
      reportId: report.report_id,
      caseTitle: report.case_title,
      sessionType: report.session_type,
      status: mapReportStatusUi(report.status),
      createdAt: report.created_at ?? null,
    },
    error: null,
  };
}

/**
 * Update saved report note content after clinician edits.
 * @param {{
 *   hospitalId: string,
 *   reportId: string,
 *   clinicianId: string,
 *   formattedTranscription: unknown,
 *   caseTitle?: string,
 *   sessionType?: string,
 * }} payload
 */
export async function updateReportContent(payload) {
  const client = requireSupabase();
  const {
    hospitalId,
    reportId,
    clinicianId,
    formattedTranscription,
    caseTitle,
    sessionType,
  } = payload;

  const { data: existing, error: fetchError } = await client
    .from("reports")
    .select("id")
    .eq("id", reportId)
    .eq("hospital_id", hospitalId)
    .eq("clinician_id", clinicianId)
    .maybeSingle();

  if (fetchError) {
    return { report: null, error: fetchError };
  }

  if (!existing) {
    return { report: null, error: { message: "Report not found." } };
  }

  const reportPatch = {};
  if (caseTitle?.trim()) reportPatch.case_title = caseTitle.trim();
  if (sessionType?.trim()) reportPatch.session_type = sessionType.trim();
  if (Object.keys(reportPatch).length) {
    reportPatch.updated_by = clinicianId;
    const { error: reportUpdateError } = await client
      .from("reports")
      .update(reportPatch)
      .eq("id", reportId);

    if (reportUpdateError) {
      return { report: null, error: reportUpdateError };
    }
  }

  const { data: transcriptionRow, error: transcriptionFetchError } = await client
    .from("report_transcriptions")
    .select("id")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (transcriptionFetchError) {
    return { report: null, error: transcriptionFetchError };
  }

  if (!transcriptionRow?.id) {
    return { report: null, error: { message: "Report transcription row not found." } };
  }

  const { error: transcriptionUpdateError } = await client
    .from("report_transcriptions")
    .update({
      formatted_transcription: formattedTranscription,
      updated_by: clinicianId,
    })
    .eq("id", transcriptionRow.id);

  if (transcriptionUpdateError) {
    return { report: null, error: transcriptionUpdateError };
  }

  const { data: report, error: reloadError } = await client
    .from("reports")
    .select("id, report_id, case_title, session_type, status, created_at")
    .eq("id", reportId)
    .maybeSingle();

  if (reloadError) {
    return { report: null, error: reloadError };
  }

  return {
    report: report
      ? {
          id: String(report.id),
          reportId: report.report_id,
          caseTitle: report.case_title,
          sessionType: report.session_type,
          status: mapReportStatusUi(report.status),
          createdAt: report.created_at ?? null,
        }
      : null,
    error: null,
  };
}

/**
 * @param {string} hospitalId
 */
export async function fetchAdminDashboardStats(hospitalId) {
  const client = requireSupabase();

  const [reportsResult, cliniciansResult] = await Promise.all([
    client.from("reports").select("id, status").eq("hospital_id", hospitalId),
    client
      .from("profiles")
      .select("id, status")
      .eq("hospital_id", hospitalId)
      .eq("role", ROLE_CLINICIAN),
  ]);

  if (reportsResult.error) {
    return { stats: null, error: reportsResult.error };
  }

  const reports = reportsResult.data ?? [];
  const clinicians = cliniciansResult.data ?? [];

  const totalReports = reports.length;
  const processingReports = reports.filter((r) => r.status === "PROCESSING").length;
  const activeClinicians = clinicians.filter((c) => c.status !== USER_STATUS_SUSPENDED).length;

  return {
    stats: {
      totalReports,
      processingReports,
      activeClinicians,
    },
    error: null,
  };
}

/**
 * @param {string} hospitalId
 */
export async function fetchReportCountsByDepartment(hospitalId) {
  const client = requireSupabase();
  const [{ data: reports, error }, departmentNames] = await Promise.all([
    client.from("reports").select("department_id").eq("hospital_id", hospitalId),
    fetchDepartmentNameMap(hospitalId),
  ]);

  if (error) {
    return { bars: [], error };
  }

  const counts = /** @type {Record<string, number>} */ ({});
  for (const row of reports ?? []) {
    const key = row.department_id ? departmentNames[row.department_id] || "Unassigned" : "Unassigned";
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const max = Math.max(...Object.values(counts), 1);
  const bars = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({
      label,
      value: Math.round((value / max) * 100),
      count: value,
    }));

  return { bars, error: null };
}

/**
 * @param {string} hospitalId
 * @param {number} [months]
 */
export async function fetchReportTrendByMonth(hospitalId, months = 6) {
  const client = requireSupabase();
  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await client
    .from("reports")
    .select("created_at, department_id")
    .eq("hospital_id", hospitalId)
    .gte("created_at", since.toISOString());

  if (error) {
    return { labels: [], series: [], error };
  }

  const bucketLabels = [];
  const buckets = [];

  for (let i = 0; i < months; i += 1) {
    const d = new Date(since);
    d.setMonth(since.getMonth() + i);
    bucketLabels.push(d.toLocaleDateString(undefined, { month: "short" }));
    buckets.push(0);
  }

  for (const row of data ?? []) {
    if (!row.created_at) continue;
    const created = new Date(row.created_at);
    const index =
      (created.getFullYear() - since.getFullYear()) * 12 + (created.getMonth() - since.getMonth());
    if (index >= 0 && index < buckets.length) {
      buckets[index] += 1;
    }
  }

  return {
    labels: bucketLabels,
    series: buckets,
    error: null,
  };
}

/**
 * @param {string} hospitalId
 * @param {number} [limit]
 */
export async function fetchRecentReportActivity(hospitalId, limit = 8) {
  const { reports, error } = await fetchReportsByHospital(hospitalId);
  if (error) {
    return { activity: [], error };
  }

  return { activity: reports.slice(0, limit), error: null };
}
